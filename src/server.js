require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const path = require('path')

const PORT = process.env.PORT || 5000

//////////////
/// MONGOOSE //
//////////////
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(result => {
    console.log('[mongoose] connected')
  })
  .catch(err => console.error('[mongoose]', err))

const Profile = mongoose.model('Profile', new mongoose.Schema({
  email: { type: String, required: true, index: true, unique: true },
  name: {type: String},
  address: {type: String}
}))

async function saveProfile(data) {
  let profile = await Profile.findOne({email: data.email})
  if(!profile) {
    profile = new Profile({
      email: data.email,
      name: data.name,
      address: data.address
    })
    const result = await profile.save()
    console.log('New profile: ', result)
    return result
  }

  profile.name = data.name
  profile.address = data.address
  const result = await profile.save()
  console.log('Updated profile: ', result)
  return result
}

async function findProfileByEmail(email) {
  const profile = await Profile.findOne({email: email})
  if(!profile) {
    console.log(`Profile '${email}' not found`)
    return null
  }

  console.log(`Profile '${email}': `, profile)
  return profile
}
  
/*
const orderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  item: { type: String, required: true }
})
const Order = mongoose.model('Order', orderSchema)

const createAndSaveOrder = async data => {
  const order = new Order(data)
  return order.save()
}

const findOrderById = (id, done) => {
  Order.findById(id, (err, data) => {
    if(err) return console.error(err)
    done(null, data)
  })
}
*/

//////////////
/// EXPRESS //
//////////////

const app = express()

// root-level logger
app.use('/', (req, res, next) => {
  console.log(`[${req.ip}] ${req.method} ${req.path}`)
  next()
})

// middlewares
app.use(bodyParser.urlencoded({extended: false}))
app.use(express.static(path.join(__dirname, '../public')))
app.get('/profile', (req, res) => {
  findProfileByEmail(req.query.email)
    .then(result => {
      if(!result) return res.sendStatus(404)
      res.json(result)
      // res.sendfile and replace tokens
    })
    .catch(err => {
      res.status(400).send(err)
    })
})

app.post('/profile', (req, res) => {
  saveProfile(req.body).then(result => {
    res.json(result)
  })
})

/*
app.post('/place_order', (req, res) => {
  createAndSaveOrder(req.body)
    .then(value => {
      console.log('[server] order placed: ', value)
      res.json(value)
    })
    .catch(err => {
      console.error('[server] failed to place order: ', err)
      res.status(400).send(err)
    })
})

app.get('/order/:id', (req, res) => {
  findOrderById(req.params.id, (err, data) => {
    if(err) return res.status(400).send(err)
    res.json(data)
  })
})
*/


app.listen(PORT, () => {
  console.log(`[server] listening on port ${PORT}...`)
})

