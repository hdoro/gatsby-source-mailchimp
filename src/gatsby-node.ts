import axios, { AxiosPromise } from 'axios';
import { validateConfig } from './configValidation';
import { colorizeLog, consoleColors } from './helpers';

export interface IPluginOptions {
  plugins: any[];
  rootURL: string;
  key: string;
  authUsername?: string;
  campaignFields?: string[];
  contentFields?: string[];
  nodeType?: string;
  count?: number;
}

const defaultUsername = 'GatsbyChimp';
const defaultCampaignsFields = [
  'campaigns.type',
  'campaigns.status',
  'campaigns.send_time',
  'campaigns.settings.subject_line',
  'campaigns.settings.preview_text',
  'campaigns.settings.title',
];
const defaultContentFields = ['html'];
const defaultNodeType = 'MailchimpCampaign';
const defaultCount = 30;

export const sourceNodes = async (
  { actions, cache, createContentDigest }: any,
  configOptions: IPluginOptions
) => {
  const { createNode, touchNode } = actions;
  const {
    rootURL,
    key,
    authUsername = defaultUsername,
    contentFields = defaultContentFields,
    nodeType = defaultNodeType,
    count,
  } = configOptions;

  validateConfig({
    rootURL,
    key,
    authUsername,
    campaignFields: configOptions.campaignFields || defaultCampaignsFields,
    contentFields,
    nodeType,
    count: count || defaultCount,
  });

  // We absolutely need total_items and campaigns.id in order
  // to paginate campaigns and fetch their content, so we append
  // them to the end of the campaignFields string, regardless
  const campaignFields = [
    ...(configOptions.campaignFields || defaultCampaignsFields),
    'campaigns.id',
    'total_items',
  ].join(',');

  const campaignsURL = `${rootURL}/campaigns`;
  const authParams = {
    withCredentials: true,
    auth: {
      username: authUsername,
      password: key,
    },
  };

  console.time(colorizeLog('\nMailchimp campaigns fetched in'));
  let campaigns = [];
  const campaignsFirstBatch = await axios.get(campaignsURL, {
    ...authParams,
    params: {
      fields: campaignFields,
      count: count || defaultCount,
      sort_field: 'send_time',
      sort_dir: 'DESC',
    },
  });

  const { data } = campaignsFirstBatch;

  if (data.campaigns) {
    campaigns = [...campaignsFirstBatch.data.campaigns];
  }

  if (data.total_items > campaigns.length && count === 0) {
    const reqLength = campaigns.length;
    const extraTimesToFetch = Math.ceil(data.total_items / reqLength);
    const reqArray = Array.from(
      { length: extraTimesToFetch },
      (v, i) => i * reqLength
    );
    for (const t of reqArray) {
      const newBatch = await axios.get(campaignsURL, {
        ...authParams,
        params: {
          status: 'sent',
          offset: t,
          fields: campaignFields,
          count: count || defaultCount,
          sort_field: 'send_time',
          sort_dir: 'DESC',
        },
      });
      campaigns = [...campaigns, ...newBatch.data.campaigns];
    }
  }
  console.timeEnd(colorizeLog('\nMailchimp campaigns fetched in'));

  let campaignRequests: any[] = [];
  let campaignsMetadata: any[] = [];
  console.time(colorizeLog('\nMailchimp campaign content fetched in'));
  for (const c of campaigns) {
    if (c.id === undefined) {
      console.log(
        `${colorizeLog("A campaign couldn't be fetched", consoleColors.BgRed)}${
          c.settings && c.settings.subject_line
            ? `: ${c.settings.subject_line}`
            : ''
        }`
      );
      continue;
    }

    const internalId = `mailchimp-campaign-${c.id}`;
    const cacheableContent = JSON.stringify(c);
    const cachedCampaign = await cache.get(internalId);

    // Make sure the campaign metadata is the same as the one just
    // fetch from Mailchimp. If so, touch the node and don't mind about
    // fetching the content again in order to save some build time
    if (cachedCampaign && cachedCampaign.content === cacheableContent) {
      touchNode({ nodeId: internalId });
      continue;
    }

    // Define the campaign's content request
    const contentURL = `${campaignsURL}/${c.id}/content`;
    campaignRequests = [
      ...campaignRequests,
      axios.get(contentURL, {
        ...authParams,
        params: {
          fields: contentFields.join(','),
        },
      }),
    ];
    campaignsMetadata = [...campaignsMetadata, c];
  }

  let campaignsContent: any = [];

  const concurrReq = 3;
  const reqSegments = Array.from(
    { length: Math.ceil(campaignRequests.length / concurrReq) },
    (v, i) => i * concurrReq
  );
  for (const t of reqSegments) {
    const requests = campaignRequests.slice(t, t + concurrReq);
    const newContent = await Promise.all(requests);
    campaignsContent = [...campaignsContent, newContent];
  }

  for (let i = 0; i < campaignsContent.length; i++) {
    const meta = campaignsMetadata[i];
    const content = campaignsContent[i];

    const internalId = `mailchimp-campaign-${meta.id}`;
    const cacheableContent = JSON.stringify(meta);
    await cache.set(internalId, { content: cacheableContent });

    const campaignNode = {
      ...meta,
      ...content.data,
      campaignId: meta.id,
      // meta information for the node
      id: internalId,
      parent: null,
      children: [],
      internal: {
        type: nodeType,
        mediaType: 'text/html',
        content: cacheableContent,
        contentDigest: createContentDigest(cacheableContent),
      },
    };
    createNode(campaignNode);
  }
  console.timeEnd(colorizeLog('\nMailchimp campaign content fetched in'));
};
