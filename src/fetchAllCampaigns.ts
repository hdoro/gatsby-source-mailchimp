import axios from 'axios';

export interface IFetchAllCampaigns {
  campaigns: any[];
  totalItems: number;
  count: number;
  defaultCount: number;
  campaignsURL: string;
  authParams: any;
  fields: string;
}

export const fetchAllCampaigns = async ({
  campaigns,
  totalItems,
  count,
  campaignsURL,
  authParams,
  fields,
  defaultCount,
}: IFetchAllCampaigns) => {
  const reqLength = campaigns.length;
  const extraTimesToFetch = Math.ceil(totalItems / reqLength);
  for (let i = 1; i < extraTimesToFetch; i++) {
    const newBatch = await axios.get(campaignsURL, {
      ...authParams,
      params: {
        status: 'sent',
        offset: reqLength * i,
        fields,
        count: count || defaultCount,
        sort_field: 'send_time',
        sort_dir: 'DESC',
      },
    });
    if (newBatch.data.campaigns) {
      campaigns = [...campaigns, ...newBatch.data.campaigns];
    }
  }
  return campaigns;
};
