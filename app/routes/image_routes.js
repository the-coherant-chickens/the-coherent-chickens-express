// Express docs: http://expressjs.com/en/api.html
const express = require('express')
// Passport docs: http://www.passportjs.org/docs/
const passport = require('passport')
const multer = require('multer')
const upload = multer()
const uploadFile = require('../../lib/s3_upload_api')

// pull in Mongoose model for images
const ImageUpload = require('../models/image')

// this is a collection of methods that help us detect situations when we need
// to throw a custom error
const customErrors = require('../../lib/custom_errors')

// we'll use this function to send 404 when non-existant document is requested
const handle404 = customErrors.handle404
// we'll use this function to send 401 when a user tries to modify a resource
// that's owned by someone else
const requireOwnership = customErrors.requireOwnership

// this is middleware that will remove blank fields from `req.body`, e.g.
// { image: { title: '', text: 'foo' } } -> { image: { text: 'foo' } }
const removeBlanks = require('../../lib/remove_blank_fields')
// passing this as a second argument to `router.<verb>` will make it
// so that a token MUST be passed for that route to be available
// it will also set `req.user`
const requireToken = passport.authenticate('bearer', { session: false })

// instantiate a router (mini app that only handles routes)
const router = express.Router()

// Tag loop callback function:
// const tagLooper = () => {
// if (req.body.image.tag === true) {
//   let arrayToUpdate = []
//   let i = 0
//   while (i < req.body.image.tag.split(',').length) {
//     const tagsToPush = req.body.image.tag.split(',')
//     arrayToUpdate.push(tagsToPush[i].trim())
//     i += 1
//   }
// }

// CREATE
// POST /images
router.post('/images', upload.single('file'), (req, res, next) => {
  // set owner of new image to be current user
  console.log(req.file)
  uploadFile(req.file)
    .then(awsRes => {
      const imageName = req.file.originalname.split('.')[0]
      const tagsArray = []
      let i = 0
      while (i < req.body.tag.split(',').length) {
        const tagsToPush = req.body.tag.split(',')
        tagsArray.push(tagsToPush[i].trim())
        i += 1
      }
      return ImageUpload.create({
        url: awsRes.Location,
        name: imageName,
        owner: req.body.owner,
        type: req.file.mimetype,
        tag: tagsArray
      })
    })
    .then(image => res.status(201).json({ image }))
    .catch(next)
})

// INDEX
// GET /images
router.get('/images', requireToken, (req, res, next) => {
  ImageUpload.find()
    .populate('owner')
    .then(images => {
      // `images` will be an array of Mongoose documents
      // we want to convert each one to a POJO, so we use `.map` to
      // apply `.toObject` to each one
      return images.map(image => image.toObject())
    })
    // respond with status 200 and JSON of the images
    .then(images => res.status(200).json({ images: images }))
    // if an error occurs, pass it to the handler
    .catch(next)
})

// SHOW
// GET /images/5a7db6c74d55bc51bdf39793
router.get('/images/:id', requireToken, (req, res, next) => {
  // req.params.id will be set based on the `:id` in the route
  ImageUpload.findById(req.params.id)
    .populate('owner')
    .then(handle404)
    // if `findById` is succesful, respond with 200 and "image" JSON
    .then(image => res.status(200).json({ image: image.toObject() }))
    // if an error occurs, pass it to the handler
    .catch(next)
})

// UPDATE
// PATCH /images/5a7db6c74d55bc51bdf39793
router.patch('/images/:id', requireToken, removeBlanks, (req, res, next) => {
  // if the client attempts to change the `owner` property by including a new
  // owner, prevent that by deleting that key/value pair
  delete req.body.image.owner

  ImageUpload.findById(req.params.id)
    .then(handle404)
    .then(image => {
      // pass the `req` object and the Mongoose record to `requireOwnership`
      // it will throw an error if the current user isn't the owner
      requireOwnership(req, image)
      if (req.body.image.tag !== true) {
        let arrayToUpdate = []
        let i = 0
        while (i < req.body.image.tag.split(',').length) {
          const tagsToPush = req.body.image.tag.split(',')
          arrayToUpdate.push(tagsToPush[i].trim())
          i += 1
        }
        req.body.image.tag = arrayToUpdate
      }
      // pass the result of Mongoose's `.update` to the next `.then`
      console.log('full image object ', req.body.image)
      // const returnObject = image.update(req.body.image)
      return image.update(req.body.image)
    })
    // if that succeeded, return 204 and no JSON
    .then(() => res.sendStatus(204))
    // if an error occurs, pass it to the handler
    .catch(next)
})

// DESTROY
// DELETE /images/5a7db6c74d55bc51bdf39793
router.delete('/images/:id', requireToken, (req, res, next) => {
  ImageUpload.findById(req.params.id)
    .then(handle404)
    .then(image => {
      // throw an error if current user doesn't own `image`
      requireOwnership(req, image)
      // delete the image ONLY IF the above didn't throw
      image.remove()
    })
    // send back 204 and no content if the deletion succeeded
    .then(() => res.sendStatus(204))
    // if an error occurs, pass it to the handler
    .catch(next)
})

module.exports = router
