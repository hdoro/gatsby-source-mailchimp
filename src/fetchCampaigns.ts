import axios from 'axios';
import { IAuthParams } from './gatsby-node';
import { colorizeLog, consoleColors } from './helpers';

export interface IFetchCampaigns {
  concurrReq: number;
  offset: number;
  authParams: IAuthParams;
  rootURL: string;
  campaignFields: string[];
  contentFields: string[];
  cache: any;
  createContentDigest: any;
  actions: any;
  nodeType: string;
}

export const fetchCampaigns = async ({
  concurrReq,
  offset,
  authParams,
  rootURL,
  campaignFields,
  contentFields,
  cache,
  createContentDigest,
  actions,
  nodeType,
}: IFetchCampaigns) => {
  const { createNode, touchNode } = actions;
  const campaignsURL = `${rootURL}/campaigns`;

  const campaignsData = await axios.get(campaignsURL, {
    ...authParams,
    params: {
      count: concurrReq,
      offset,
      fields: campaignFields.join(','),
      sort_field: 'send_time',
      sort_dir: 'DESC',
    },
  });

  // Non-cached campaigns that should have their content fetched
  let campaignRequests: any[] = [];
  let campaignsMetadata: any[] = [];
  for (const c of campaignsData.data.campaigns) {
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

    // Fetch the campaign's content
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

  const campaignsContent = await Promise.all(campaignRequests);

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

  return campaignsData.data.total_items;
};
