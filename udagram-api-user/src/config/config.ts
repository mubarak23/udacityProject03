export const config = {
  'username': 'postproject003', // process.env.POSTGRES_USERNAME,
  'password': '?project003?', // process.env.POSTGRES_PASSWORD,
  'database': 'project003', //process.env.POSTGRES_DB,
  'host':  'project003.crtjs28ovjm0.us-east-1.rds.amazonaws.com', // process.env.POSTGRES_HOST,
  'dialect': 'postgres',
  'aws_region': 'us-east-1', //process.env.AWS_REGION,
  'aws_profile': 'udagramUser', //process.env.AWS_PROFILE,
  'aws_media_bucket': 'arn:aws:s3:::project3bucket001', //process.env.AWS_BUCKET,
  'url': 'http://localhost:8080', //process.env.URL,
  'jwt': {
    'secret': process.env.JWT_SECRET,
  },
};
