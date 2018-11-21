import { validateConfig } from './configValidation';
import { colorizeLog } from './helpers';
import { fetchCampaigns } from './fetchCampaigns';

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
const concurrReq = 9;

export interface IAuthParams {
  withCredentials: boolean;
  auth: {
    username: string;
    password: string;
  };
}

export const sourceNodes = async (
  { actions, cache, createContentDigest }: any,
  configOptions: IPluginOptions
) => {
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
  ];

  const authParams: IAuthParams = {
    withCredentials: true,
    auth: {
      username: authUsername,
      password: key,
    },
  };
  const baseFetchArgs = {
    // In case the users passess a number bigger than 0 and lower than
    // concurrReq, we want to use that
    concurrReq: count && count < concurrReq && count !== 0 ? count : concurrReq,
    rootURL,
    authParams,
    nodeType,
    campaignFields,
    contentFields,
    actions,
    cache,
    createContentDigest,
  };

  console.time(colorizeLog('\nMailchimp campaigns fetched in'));

  // Save the first batch and the total number of campaigns
  const totalItems = await fetchCampaigns({
    ...baseFetchArgs,
    offset: 0,
  });
  // The actual number of campaigns we'll fetch is equivalent to the total
  // number of items if user specifies count = 0 or (count || default)
  const actualCount = count === 0 ? totalItems : count || defaultCount;

  // If we have more to fetch than what we already did, then we'll want
  // to fetch more and re-run the fetchCampaigns again
  if (actualCount < concurrReq) {
    console.time(colorizeLog('\nMailchimp campaigns fetched in'));
    return;
  }

  // Create an array with a length equivalent to the number of times we
  // still have to run the fetchCampaigns function
  const iterable = Array.from(
    { length: Math.ceil(actualCount / concurrReq) },
    (v, i) => i + 1
  );
  for (const i of iterable) {
    await fetchCampaigns({
      ...baseFetchArgs,
      offset: i * concurrReq,
    });
  }
  console.timeEnd(colorizeLog('\nMailchimp campaigns fetched in'));
};
