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
    //res.status(201).json(newProfile)
    res.redirect(`/profiles/${encodeURIComponent(newProfile.email)}`)
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

app.delete('/profiles', async (req, res) => {
  console.warn('Temporary route DELETE /profiles being used')
  const count = (await Profile.deleteMany({})).deletedCount
  res.send(`Deleted ${count} profiles`)
})

app.get('/profiles/:email', async (req, res) => {
  const profile = await Profile.findOne({email: req.params.email})
  if(!profile) return res.sendStatus(404)

  const pathname = path.join(__dirname, '../public/profile.html')
  let page = await fs.readFile(pathname, {encoding: 'utf-8'})
  page = page.replaceAll('%EMAIL', profile.email || '')
  page = page.replaceAll('%NAME', profile.name || '')
  page = page.replaceAll('%ADDRESS', profile.address || '')

  // const acceptHeader = req.header('accept') <-- use this for sending html or json
  res.send(page)
})

// should be PUT, but PUT is not supported by forms
app.post('/profiles/:email', async (req, res) => {
  const email = req.params.email
  const method = req.body._method

  if(method === 'PUT') {
    const profile = await Profile.findOne({email: email})
    if(!profile) return res.sendStatus(404)
    profile.name = req.body.name || profile.name
    profile.address = req.body.address || profile.address
  
    const updatedProfile = await profile.save()
    return res.redirect(`/profiles/${encodeURIComponent(updatedProfile.email)}`)
  }

  if(method === 'DELETE') {
    await Profile.deleteOne({email: email})
    return res.redirect('/')
  }

  res.sendStatus(400)
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
  if(email) {
    return res.redirect(`/profiles/${encodeURIComponent(email)}`)
  }

  // load page with tokens
  let page = await fs.readFile(path.join(__dirname, '../public/index.html'), { encoding: 'utf-8'})  

  // add existing profiles
  const profiles = await Profile.find({})
  const listItems = profiles.map(x => `<option value="${x.email}" ${x.email === email ? 'selected' : ''}>${x.email}</option>`)
  const listItemsAsHtml = listItems.join('\n')
  page = page.replace('%PROFILES', listItemsAsHtml)
  
  res.send(page)
})

app.use(express.static(path.join(__dirname, '../public')))

app.listen(PORT, () => {
  console.log(`[server] listening on port ${PORT}...`)
})

