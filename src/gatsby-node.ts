import axios from 'axios';
import { validateConfig } from './configValidation';
import { colorizeLog } from './helpers';
import { fetchAllCampaigns } from './fetchAllCampaigns';
import { fetchContent } from './fetchContent';

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
    campaignFields = defaultCampaignsFields,
    contentFields = defaultContentFields,
    nodeType = defaultNodeType,
    count,
  } = configOptions;

  validateConfig({
    rootURL,
    key,
    authUsername,
    campaignFields,
    contentFields,
    nodeType,
    count: count || defaultCount,
  });

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
      fields: `${campaignFields.join(',')},campaigns.id,total_items`,
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
    campaigns = await fetchAllCampaigns({
      campaigns,
      totalItems: data.total_items,
      count,
      defaultCount,
      authParams,
      campaignFields,
      campaignsURL,
    });
  }
  console.timeEnd(colorizeLog('\nMailchimp campaigns fetched in'));

  console.time(colorizeLog('\nMailchimp campaign content fetched in'));
  for (const c of campaigns) {
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

    // Fetch the campaign's content
    const contentURL = `${campaignsURL}/${c.id}/content`;
    const content = await fetchContent({
      URL: contentURL,
      contentFields,
      authParams,
    });

    await cache.set(internalId, { content: cacheableContent });

    const campaignNode = {
      ...c,
      ...content.data,
      campaignId: c.id,
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