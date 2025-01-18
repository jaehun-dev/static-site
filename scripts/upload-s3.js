// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { readFile } from "node:fs/promises"
import { parseArgs } from "node:util"
import {
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3"
import {
  isMain,
  validateArgs,
} from "@aws-doc-sdk-examples/lib/utils/util-node.js"

const client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

const loadArgs = () => {
  const options = {
    dirname: {
      type: "string",
    },
  }
  const results = parseArgs({ options, allowPositionals: true })
  const { errors } = validateArgs({ options }, results)

  return { errors, results }
}

if (isMain(import.meta.url)) {
  const { errors, results } = loadArgs()

  if (!errors) {
    main({ ...results.values })
  } else {
    console.error(errors.join("\n"))
  }
}

const main = async ({ dirname, prefix = "" }) => {
  await uploadDirectory({ currentDir: dirname, prefix })
}

const uploadDirectory = async ({ currentDir, prefix = "" }) => {
  try {
    const entries = await readdir(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      const entryPath = join(currentDir, entry.name)
      const nextPrefix = prefix ? `${prefix}/${entry.name}` : entry.name

      if (entry.isDirectory()) {
        await uploadDirectory({
          currentDir: entryPath,
          prefix: nextPrefix,
        })
      } else if (entry.isFile()) {
        await uploadFile({
          sourceFilePath: entryPath,
          uploadPath: nextPrefix,
        })
      }
    }
  } catch (err) {
    console.error(`Error uploading directory ${currentDir} to S3.\n`, err)
  }
}

const bucketName = process.env.AWS_BUCKET_NAME

const uploadFile = async ({ sourceFilePath, uploadPath }) => {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: uploadPath,
    Body: await readFile(sourceFilePath),
  })

  try {
    const response = await client.send(command)

    console.log(response)
  } catch (caught) {
    if (
      caught instanceof S3ServiceException &&
      caught.name === "EntityTooLarge"
    ) {
      console.error(
        `Error from S3 while uploading object to ${bucketName}. \
The object was too large. To upload objects larger than 5GB, use the S3 console (160GB max) \
or the multipart upload API (5TB max).`
      )
    } else if (caught instanceof S3ServiceException) {
      console.error(
        `Error from S3 while uploading object to ${bucketName}.  ${caught.name}: ${caught.message}`
      )
    } else {
      throw caught
    }
  }
}
