import axios from 'axios';

export interface IFetchAllCampaigns {
  campaigns: any[];
  totalItems: number;
  count: number;
  defaultCount: number;
  campaignsURL: string;
  authParams: any;
  campaignFields: string[];
}

export const fetchAllCampaigns = async ({
  campaigns,
  totalItems,
  count,
  campaignsURL,
  authParams,
  campaignFields,
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
        fields: campaignFields.join(','),
        count: count || defaultCount,
      },
    });
    if (newBatch.data.campaigns) {
      campaigns = [...campaigns, ...newBatch.data.campaigns];
    }
  }
  return campaigns;
};
