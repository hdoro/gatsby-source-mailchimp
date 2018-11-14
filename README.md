# gatsby-source-mailchimp

Use your [Mailchimp API](https://developer.mailchimp.com) key to download your campaigns into [Gatsby](https://www.gatsbyjs.org/)'s GraphQL data layer!

⚠ **Please note:** This plugin was made out of a specific necessity, so it doesn't cover all of Mailchimp's data sources, focusing only on campaigns. If you want to add extra functionalities, feel free to [create a PR](https://github.com/hcavalieri/gatsby-source-mailchimp/pulls) and contribute :smile:

## Table of content

- [Basic Usage](#basic-usage)
- [Options](#options)
- [Caveats](#caveats)
- [Todo](#todo)
- [License](#license)

## Basic usage

```
yarn add gatsby-source-mailchimp
# or
npm i gatsby-source-mailchimp --save
```

```js
// in your gatsby-config.js
module.exports = {
  // ...
  plugins: [
    {
      resolve: 'gatsby-source-mailchimp',
      options: {
        // Avoid including your key directly in your file.
        // Instead, opt for adding them to .env files for extra
        // security ;)
        key: 'asd712jdas90122jdas90122jkadsd1-usXX',
        rootURL: 'https://usXX.api.mailchimp.com/3.0',
      },
    },
  ],
  // ...
};
```

Go through http://localhost:8000/___graphql after running `gatsby develop` to understand the created data and create a new query and checking available collections and fields by typing `CTRL + SPACE`.

## Options

| Options        | Type             | Default                   | Description                                                                                                                                                                                     |
| -------------- | ---------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| key            | string           |                           | **[required]** Your API key                                                                                                                                                                     |
| rootURL        | string           |                           | **[required]** Your key's root API URL. Usually in the format `https://usXX.api.mailchimp.com/3.0`                                                                                              |
| authUsername   | string           | `GatsbyChimp`             | In case you want to name your requests, fill this value.                                                                                                                                        |
| campaignFields | array of strings | See the [section below](#default-campaignFields-value) | Which fields to fetch from campaigns' metadata. See [Mailchimp's documentation on campaigns fields](https://developer.mailchimp.com/documentation/mailchimp/reference/campaigns)                |
| contentFields  | array of strings | `['html']`                | Which fields to fetch from campaigns' content. See [Mailchimp's documentation on campaign content fields](https://developer.mailchimp.com/documentation/mailchimp/reference/campaigns/content/) |
| nodeType       | string           | `MailchimpCampaign`       | How to name campaign nodes in GraphQL                                                                                                                                                           |
| count          | string           | `30`                      | Number of campaigns to fetch. **Use `0` in order to fetch them all**                                                                                                                            |

### Default `campaignFields` value

In terms of metadata, I believe most users will only need the campaign's `type` and `status` for filtering; `title` for internal usage; `send_time` for displaying dates for users; and `subject_line` and `preview_text` for showing a preview of the campaign. For such, the default fields are as follow:

```js
const defaultCampaignsFields = [
  'campaigns.type',
  'campaigns.status',
  'campaigns.send_time',
  'campaigns.settings.subject_line',
  'campaigns.settings.preview_text',
  'campaigns.settings.title',
];
```

You can refer to [Mailchimp's documentation on campaigns](https://developer.mailchimp.com/documentation/mailchimp/reference/campaigns) in order to explore what other fields you can fetch, but be aware that you'll have to include these in your custom `campaignFields` if you want them to show up in results!

## Using .env variables to hide your key

If you don't want to attach your API key to the repo, you can easily store it in .env files by doing the following:

```js
// In your .env file
MAILCHIMP_KEY = 'asd712jdas90122jdas90122jkadsd1-usXX';

// In your gatsby-config.js file
require('dotenv').config({
  path: `.env.${process.env.NODE_ENV}`,
});

module.exports = {
  // ...
  plugins: [
    {
      resolve: 'gatsby-source-mailchimp',
      options: {
        key: process.env.MAILCHIMP_KEY,
        rootURL: 'https://usXX.api.mailchimp.com/3.0',
        // ...
      },
    },
  ],
  // ...
};
```

This example is based off [Gatsby Docs' implementation](https://next.gatsbyjs.org/docs/environment-variables).

## Caveats

As of now, the only known caveat is that, in order to preserve cache and avoid fetching the HTML content for each campaign every single time (which takes from 20s to 1m for 50 large campaigns), the plugin uses Gatsby's cache in a way that **considers changes made only to the `campaignFields`**. If you make a minor change to your HTML, as it stands, you'll have to change some of the campaign metadata that you're pulling into your site.

Unfortunately, Mailchimp doesn't offer a `last_edited` field, so all we can do for now is to avoid caching alltogether. I haven't added a flag for this because it seems quite unnecessary, but feel free to create an optional `avoidCaching` param if you need!

## Reference

The process to save campaigns in `gatsby-node.js` is as follows:

1. We hit the `/campaigns/` endpoint with due limits and pagination (set by user configuration);
2. This returns each campaign's metadata, which is used to check the cache.
3. If it's in cache, then we're good, else we add a request to its content to an array;
4. We run `Promise.all` with this array and iterate over it to get each campaign's content;
5. Finally, we join the metadata and content and create the node, setting a new entry to the cache :wink:.

## TODO

- Explore better ways to cache the content.

## License

I'm not very literate on licensing, so I just went with **MIT**, if you have any considerations just let me know! Oh, and, of course, feel free to contribute to this plugin, even bug reports are welcome!