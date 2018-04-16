Generate PresignedURL Bot for Slack
===

Upload file from slack to S3 and generate Pre Signed-URL.

## Configure

1. create S3 bucket

1. create IAM Policy  
Require policy `s3:PutObject` and `s3:GetObject`

1. configure AWS Credentials or IAM Role

1. create slack app https://api.slack.com/apps  
Require scopes `bot` and `files:read`  
Get `OAuth Access Token` & `Bot User OAuth Access Token`

1. configure `config.json`  
```
{
  "channels": ["slack channel name", "slack channel name"],
  "bucket_name": "s3 bucket name",
  "expires_day": "url expiration date (max 7)"
}
```

## Usage

```
$ userToken=xoxp-xxxxxxxxxxxx-xxxxxxxxxxxx-xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx botToken=xoxb-xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx node bot.js
```

### Use Docker

```
$ docker build -t bot:latest .
$ docker run -e userToken=xoxp-xxxxxxxxxxxx-xxxxxxxxxxxx-xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx -e botToken=xoxb-xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx bot:latest
```

## License

MIT
