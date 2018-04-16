'use strict'

if (!process.env.botToken && !process.env.userToken) {
  console.log('Error: Specify token in environment');
  process.exit(1);
}

const config = require('./config.json');
const Botkit = require('botkit');
const request = require('request-promise');
const moment = require('moment');
const aws = require('aws-sdk');

const s3 = new aws.S3();
const controller = Botkit.slackbot({
  debug: process.env.DEBUG || false,
});
const bot = controller.spawn({
  token: process.env.botToken
}).startRTM();
const userToken = process.env.userToken

const downloadSlackPrivateFile = async (url, token) => {
  const requestOptions = {
    url: url,
    encoding: null,
    headers: {
      Authorization: 'Bearer ' + token
    }
  }

  try {
    return await request.get(requestOptions);
  } catch(e) {
    throw e;
  }
}

const uploadFileToS3 = async (options) => {
  try {
    console.log(options);
    return await s3.upload(options).promise();
  } catch(e) {
    throw e;
  }
}

const getPresignedUrl = async (options) => {
  try {
    return await s3.getSignedUrl('getObject', options);
  } catch(e) {
    throw e;
  }
}

controller.on('file_share', (bot, message) => {
  const slackFileUrl = message.file.url_private_download;
  const channelID = message.channel;

  // check channel
  if (channelID == config.channel_id) {
    (async () => {
      // download uploadfile
      const content = await downloadSlackPrivateFile(slackFileUrl, userToken);

      // upload s3
      const s3Options = {
        Bucket: config.bucket_name,
        Key: `${message.user}/${message.file.name}`,
        Body: content,
        ContentType: message.file.mimetype
      }
      await uploadFileToS3(s3Options);

      // get pre-signed url
      delete s3Options['Body'];
      delete s3Options['ContentType'];
      s3Options['Expires'] = config.expires_day * 86400;
      const preSignedUrl = await getPresignedUrl(s3Options);

      // response
      bot.reply(message, `Generate Presigned URL\n\`\`\`filename: ${message.file.name}\nexpires: ${moment().add(config.expires_day, 'days').format('YYYY/MM/DD HH:mm:ss')}\`\`\` ${preSignedUrl}`);
    })();
  }
})