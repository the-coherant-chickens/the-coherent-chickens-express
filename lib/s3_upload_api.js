'use strict'
require('dotenv').config()

const AWS = require('aws-sdk')
const S3 = new AWS.S3()

// * ACL KEY *
// look up display vs download in browser
// ^ fix access denied

const uploadFile = function (file) {
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: 'thecoherentchickens',
      Key: `${Date.now()}_${file.originalname}`,
      Body: file.buffer,
      // allows us to use memory storage, uploading buffer to AWS
      ContentType: file.mimetype,
      ACL: 'public-read'
    }

    S3.upload(params, (err, data) => {
      if (err) {
        reject(err)
      }

      resolve(data)
    })
  })
}

// promiseReadFile(file)
//   .then(fileData => {
//     const type = mime.lookup(file)
//     // look up mime type of file
//
//     const newFilename = `${Date.now()}_${path.basename(file)}`
//     // create unique filename
//
//     // use mime as ContentType in params
//     const params = {
//       Bucket: 'whosaysafunkbandcantplayrock',
//       Key: newFilename,
//       Body: fileData,
//       ContentType: type,
//       ACL: 'public-read'
//     }
//     return params
//   })
//   .then(params => {
//     return S3.upload(params).promise()
//   })
//   .catch(console.error)

module.exports = uploadFile
