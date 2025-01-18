declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // github repository secrets
      AWS_ACCESS_KEY_ID: string
      AWS_SECRET_ACCESS_KEY: string
      AWS_S3_REGION: string
      S3_BUCKET_NAME: string
    }
  }
}
