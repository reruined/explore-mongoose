require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const path = require('path')
const livereload = require('livereload')
const connectLivereload = require('connect-livereload')

const PORT = process.env.PORT || 5000

//////////////////
/// LIVE RELOAD //
//////////////////
const liveReloadServer = livereload.createServer()
liveReloadServer.server.once('connection', () => {
  setTimeout(() => {
    liveReloadServer.refresh("/");
  }, 100);
})

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
    result.newEntry = true
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
app.use(connectLivereload())
app.use(bodyParser.urlencoded({extended: false}))
app.use(express.static(path.join(__dirname, '../public')))

app.get('/profile', (req, res) => {
  findProfileByEmail(req.query.email)
    .then(result => {
      const obj = {
        email: result.email,
        name: result.name,
        address: result.address
      }
      const str = 'Requested profile: '
      const objStr = JSON.stringify(obj, null, 2)
      res.send(`<p>${str}</p><pre>${objStr}</pre>`)
      // res.sendfile and replace tokens
    })
    .catch(err => {
      res.status(400).send(err)
    })
})

app.post('/profile', (req, res) => {
  saveProfile(req.body)
    .then(result => {
      const obj = {
        email: result.email,
        name: result.name,
        address: result.address
      }
      const str = result.newEntry ? 'Created new profile: ' : 'Updated existing profile: '
      const objStr = JSON.stringify(obj, null, 2)
      res.send(`<p>${str}</p><pre>${objStr}</pre>`)
    })
    .catch(err => {
      res.status(400).send(err)
    })
})

app.post('/create-profile', async (req, res) => {
  try {
    const {
      email,
      name,
      address
    } = req.body
  
    if(!email) throw new Error("Missing key 'email' in body")
  
    const profile = await Profile.findOne({email})
    if(profile) throw new Error(`Profile '${email}' already exists`)

    const newProfile = await new Profile({
      email,
      name,
      address
    }).save()
    res.json(newProfile)
  }
  catch (e) {
    console.error(e.message)
    res.status(400).send(e.message)
  }
})


app.listen(PORT, () => {
  console.log(`[server] listening on port ${PORT}...`)
})

