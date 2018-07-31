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
  retry: 3,
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

const getChannelName = async (bot, channelID) => {
  return new Promise((resolve, reject) => {
    if (channelID.charAt(0) === 'C') {
      bot.api.channels.info({channel: channelID}, (err, result) => {
        err ? reject(err) : resolve(result.channel.name);
      });
    } else if (channelID.charAt(0) === 'G') {
      bot.api.groups.info({channel: channelID}, (err, result) => {
        err ? reject(err) : resolve(result.group.name);
      });
    } else {
      reject('undefined channel id');
    }
  });
}

const getFileInfo = async (bot, fileID) => {
  return new Promise((resolve, reject) => {
    bot.api.files.info({file:fileID}, (err, result) => {
      err ? reject(err) : resolve(result);
    });
  });
}

const postMessage = async (bot, channelID, text) => {
  return new Promise((resolve, reject) => {
    bot.api.chat.postMessage({channel:channelID, text:text}, (err, result) => {
      err ? reject(err) : resolve(result);
    });
  });

}

controller.hears(['hello', 'hi'], 'direct_mention,mention', (bot, message) => {
  bot.reply(message, 'hi');
});

controller.on('file_shared', (bot, message) => {
  (async () => {
    try {
      console.log(message)
      const fileInfo = await getFileInfo(bot, message.file_id)

      let channelID;
      if (fileInfo.file.channels.length !== 0) {
        channelID = fileInfo.file.channels[0];
      } else if (fileInfo.file.groups.length !== 0) {
        channelID = fileInfo.file.groups[0];
      }

      const channelName = await getChannelName(bot, channelID);
      // check channel
      if (config.channels.includes(channelName)) {
        // download uploadfile
        const slackFileUrl = fileInfo.file.url_private_download;
        const content = await downloadSlackPrivateFile(slackFileUrl, userToken);

        // upload s3
        const s3Options = {
          Bucket: config.bucket_name,
          Key: `${fileInfo.file.user}/${fileInfo.file.name}`,
          Body: content,
          ContentType: fileInfo.file.mimetype
        }
        await uploadFileToS3(s3Options);

        // get pre-signed url
        delete s3Options['Body'];
        delete s3Options['ContentType'];
        s3Options['Expires'] = config.expires_day * 86400;
        const preSignedUrl = await getPresignedUrl(s3Options);

        // response
        postMessage(bot, channelID, `Generate Presigned URL\n\`\`\`filename: ${fileInfo.file.name}\nexpires: ${moment().add(config.expires_day, 'days').format('YYYY/MM/DD HH:mm:ss')}\`\`\` ${preSignedUrl}`)
      }
    } catch(e) {
      console.log(e)
    }
  })();
})
