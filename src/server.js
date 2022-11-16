require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')

const PORT = process.env.PORT || 5000

// configure mongoose
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})

const orderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  item: { type: String, required: true }
})

const Order = mongoose.model('Order', orderSchema)

const createAndSaveOrder = (data, done) => {
  const order = new Order(data)
  order.save((err, data) => {
    if(err) return console.error(err)
    done(null, data)
  })
}

const findOrderById = (id, done) => {
  Order.findById(id, (err, data) => {
    if(err) return console.error(err)
    done(null, data)
  })
}

// configure express
const app = express()

// root-level logger
app.use('/', (req, res, next) => {
  console.log(`[${req.ip}] ${req.method} ${req.path}`)
  next()
})

// middlewares
app.use(bodyParser.urlencoded({extended: false}))
app.use(express.static(process.env.PUBLIC_FOLDER_PATH))

app.post('/place_order', (req, res) => {
  createAndSaveOrder(req.body, (err, data) => {
    if(err) return res.sendStatus(400)
    res.json(data)
  })
})

app.get('/order/:id', (req, res) => {
  findOrderById(req.params.id, (err, data) => {
    if(err) return res.status(400).send(err)
    res.json(data)
  })
})

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}...`)
})

