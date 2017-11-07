/**
 * Created by namdoremon on 8/2/17.
 */
const express = require('express')
const nunjucks = require('nunjucks')
const multer = require('multer')
const shortid = require('shortid')
const bodyParser = require('body-parser')
const session = require('express-session')
const morgan = require('morgan')
const fs = module.exports = require('fs')
const flash = require('connect-flash')
const passport = require('passport')
const Strategy = require('passport-local').Strategy

const app = express()
const router = express.Router()
const port = 3000
const db = require('./models/main')
const routerFrontEnd = require('./routes/front-end/main').routerFrontEnd
const frontendPath = 'front-end/pages/'
const routerBackEnd = require('./routes/back-end/main').routerAdmin
const backendPath = 'back-end/pages/'
const authentication = require('./authentication/passport/passport')
const passportLocal = require('./authentication/passport/local/passport-local')
// const uploadPhotos = require('./routes/reuse/uploadImages').product(multer, shortid)

const product = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/images/products/')
    },
    filename: function (req, file, cb) {
        if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg') {
            cb(null, shortid.generate() + '_' + file.originalname)
        } else {
            console.log(file.mimetype)
        }
    }
})
console.log('server')
const uploadProduct = multer({ storage: product })

/***
 * https://expressjs.com/en/4x/api.html#app.use
 * app.use(): mounts the  specified middleware function or functions at the specified path.
 * express.static():  serves static files(sử dụng các file tĩnh trong ứng dụng)
 */
app.set('trust proxy', 1)
app.use(session({
    secret: 'FMS',
    resave: true,
    saveUninitialized: true,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // cookie sẽ hết hạn trong 30 ngày
        secure: false
    }
}))

app.use(function (req, res, next) {
    res.locals.carts = (req.session.passport) ? req.session.passport.user.sumProduct : req.session.sumProduct
    !req.session.passport ? res.locals.login_status = false : res.locals.wishlish = req.session.passport.user.sumWishlish
    if (req.session.passport) {
        const listWishlish = 'SELECT attribute_product_id FROM wishlish WHERE customer_id = ${customer_id};'
        db.any(listWishlish, {
            customer_id: parseInt(req.session.passport.user.id)
        })
            .then(data => {
                data.length === 0 ? res.locals.listWishlish = 0 : res.locals.listWishlish = data
            })
    }
    // console.log(`res.locals.carts ${res.locals.carts}`)
    // console.log('aaaaaaaaaaaaaa', req.session)
    next()
})

app.use('/public', express.static('public'))
app.use(bodyParser.urlencoded({
    extended: true
}))
// parse application/json
app.use(bodyParser.json())

/***
 * configure template engine nụnjucks
 */
nunjucks.configure('views', {
    autoescape: true,
    express: app,
    watch: true,

})
/***
 * https://expressjs.com/en/4x/api.html#app.engine
 * Use this method, if you wish to 'map' a different extension to the template engine.
 * (Sử dụng method này nếu muốn sử dụng các extension template khác nhau)
 * With nunjucks, we use nunjucks.render(trong nunjucks thì sử dụng hàm nụnjucks.render)
 */
app.engine('html', nunjucks.render)
/***
 * https://expressjs.com/en/4x/api.html#app.set
 * The default engine extension to use when omitted.
 * (engine extension mà bạn sử dụng cho toàn bộ ứng dụng, có thể không cần viết đuôi file)
 */
app.set('view engine', 'html')
app.use(morgan('dev'))
app.use(passport.initialize())
app.use(passport.session())


passportLocal(passport, Strategy, db)
authentication(passport, db)
app.use(flash())
app.use(router)
/***
 * All routers
 */

routerFrontEnd(db, router, frontendPath)
routerBackEnd(db, router, backendPath, uploadProduct)

app.listen(port, function () {
    console.log(`server running on port ${port}!`)
})
