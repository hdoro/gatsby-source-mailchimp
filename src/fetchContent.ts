import axios from 'axios';

export interface IFetchAllCampaigns {
  URL: string;
  contentFields: string[];
  authParams: any;
}

export const fetchContent = async ({
  URL,
  contentFields,
  authParams,
}: IFetchAllCampaigns) => {
  const campaignContent = await axios.get(URL, {
    ...authParams,
    params: {
      fields: contentFields.join(','),
    },
  });
  return campaignContent;
};
