const mongoose = require('mongoose')

const imageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  tag: {
    type: [String],
    required: true
  },
  url: {
    type: String,
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
})

module.exports = mongoose.model('Image', imageSchema)
