import { throwError } from './helpers';

interface IPluginProps {
  rootURL: string;
  key: string;
  authUsername: string;
  campaignFields: string[];
  contentFields: string[];
  nodeType: string;
  count: number;
}

export const validateConfig = ({
  rootURL,
  key,
  authUsername,
  campaignFields,
  contentFields,
  nodeType,
  count,
}: IPluginProps) => {
  if (typeof rootURL !== 'string' || rootURL.substr(0, 4) !== 'http') {
    throwError('rootURL must be a valid URL!');
  }
  if (typeof nodeType !== 'string') {
    throwError('nodeType must be a string!');
  }
  if (typeof authUsername !== 'string' || authUsername.includes(' ')) {
    throwError('authUsername must be a string without spaces!');
  }
  if (typeof count !== 'number' || count < 1) {
    throwError('Count must be a number greater or equal than 1');
  }
  if (typeof key !== 'string') {
    throwError("The API Key is either missing or isn't a string");
  }
  if (
    contentFields === undefined ||
    typeof contentFields.join(',') !== 'string'
  ) {
    throwError(
      'Please pass a contentFields value as either undefined or as an array of strings'
    );
  }
  if (
    campaignFields === undefined ||
    typeof campaignFields.join(',') !== 'string'
  ) {
    throwError(
      'Please pass a campaignsFields value as either undefined or as an array of strings'
    );
  }
};
