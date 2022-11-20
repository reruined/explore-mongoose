require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const path = require('path')
const livereload = require('livereload')
const connectLivereload = require('connect-livereload')
const fs = require('fs/promises')
const { assert } = require('console')

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
  email: { 
    type: String, 
    required: true, 
    index: true, 
    unique: true,
    validate: /@/
  },
  name: {
    type: String
  },
  address: {
    type: String
  }
}))

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

// routes
app.post('/profiles', async (req, res) => {
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
    res.status(201).json(newProfile)
  }
  catch (e) {
    console.error(e.message)
    res.status(400).send(e.message)
  }
})

app.get('/profiles', async (req, res) => {
  try {
    const profiles = await Profile.find({})
    res.json(profiles)
  }
  catch {
    console.error(e.message)
    res.status(400).send(e.message)
  }
})

app.get('/profiles/:email', async (req, res) => {
  const profile = await Profile.findOne({email: req.params.email})
  if(!profile) return res.sendStatus(404)
  res.json(profile)
})

app.put('/profiles/:email', async (req, res) => {
  const profile = await Profile.findOne({email: req.params.email})
  if(!profile) return res.sendStatus(404)

  profile.name = req.body.name || profile.name
  profile.address = req.body.address || profile.address

  const updatedProfile = await profile.save()
  console.log(updatedProfile)
  res.json(updatedProfile)
})

app.delete('/profiles/:email', async (req, res) => {
  const profile = await Profile.findOne({email: req.params.email})
  if(!profile) return res.sendStatus(404)

  if(Object.keys(req.body).length !== 0) {
    return res.status(400).send('Request body must be empty')
  }

  await Profile.deleteOne({_id: profile._id})
  res.sendStatus(204)
})


app.get('/', async (req, res) => {
  const email = req.query.profile

  // load page with tokens
  let page = await fs.readFile(path.join(__dirname, '../public/index.html'), { encoding: 'utf-8'})  

  // add existing profiles
  const profiles = await Profile.find({})
  const listItems = profiles.map(x => `<option value="${x.email}" ${x.email === email ? 'selected' : ''}>${x.email}</option>`)
  const listItemsAsHtml = listItems.join('\n')
  page = page.replace('%PROFILES', listItemsAsHtml)

  // populate form with selected profile, or defaults
  const profile = email ? await Profile.findOne({email}).orFail() : {}
  page = page.replace('%EMAIL', profile.email || '')
  page = page.replace('%NAME', profile.name || '')
  page = page.replace('%ADDRESS', profile.address || '')
  
  res.send(page)
})

app.use(express.static(path.join(__dirname, '../public')))

app.listen(PORT, () => {
  console.log(`[server] listening on port ${PORT}...`)
})

