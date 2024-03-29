const express = require('express')
const app = express()
const path = require('path')
const hbs = require('hbs')

hbs.registerHelper('dateFormat', require('handlebars-dateformat'))

const request = require('postman-request')
const port = process.env.PORT
const formidable = require('express-formidable')
const mongoose = require('mongoose')

const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')

const Appointment = require('./models/appointment')

const publicDirPath = path.join(__dirname, '../public/')
const viewPath = path.join(__dirname, '../templates/views')
const partialsPath = path.join(__dirname, '../templates/partials')

app.set('view engine', 'hbs')
app.set('views', viewPath)
hbs.registerPartials(partialsPath)

app.use(formidable())
app.use(cookieParser())

app.use(express.static('public'))

const jwtVerify = (cookies) => {
  if (cookies.JWT === undefined || cookies.JWT === '') {
    return false
  }
  return jwt.verify(cookies.JWT, process.env.JWT_SECRET)
}

app.get('/', (req, res) => {
  res.render('index', {
    error: false,
    pageTitle: 'Appointment Manager | Log In',
    query: req.query,
  })
})

app.post('/login', async (req, res) => {
  const hashedAdminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 8)

  const isMatch = await bcrypt.compare(req.fields.password, hashedAdminPassword)

  if (req.fields.username !== process.env.ADMIN_USERNAME || !isMatch) {
    return res.render('index', {
      error: true,
      pageTitle: 'Appointment Manager | Login',
      query: req.query,
    })
  }

  const token = jwt.sign(
    { _id: process.env.ADMIN_USERNAME },
    process.env.JWT_SECRET
  )

  res.cookie('JWT', token, { maxAge: 600000 })
  res.redirect('/home')
})

app.post('/logout', async (req, res) => {
  res.cookie('JWT', '', { maxAge: 1 })
  res.redirect('/')
})

app.get('/home', (req, res) => {
  if (!jwtVerify(req.cookies)) {
    return res.redirect('/')
  }

  res.render('home', {
    pageTitle: 'Appointment Manager',
  })
})

app.get('/users', async (req, res) => {
  if (!jwtVerify(req.cookies)) {
    return res.redirect('/')
  }

  request(
    process.env.USER_SERVICE_URL,
    { json: true },
    (error, response, body) => {
      res.render('list-users', {
        pageTitle: 'User List',
        userList: body,
      })
    }
  )
})

app.get('/users/create', async (req, res) => {
  if (!jwtVerify(req.cookies)) {
    return res.redirect('/')
  }

  res.render('create-user', {
    pageTitle: 'Create User',
  })
})

app.post('/users/create', (req, res) => {
  request.post(
    process.env.USER_SERVICE_URL,
    {
      body: req.fields,
      json: true,
    },
    (error, response, _) => {
      if (response.statusCode === 400) {
        res.redirect('/email-taken')
      } else {
        res.redirect('/users')
      }
    }
  )
})

app.get('/email-taken', (req, res) => {
  res.render('email-taken')
})

app.get('/users/:userId', async (req, res) => {
  if (!jwtVerify(req.cookies)) {
    return res.redirect('/')
  }

  new Promise((resolve, reject) => {
    request(
      process.env.USER_SERVICE_URL + '/' + req.params.userId,
      { json: true },
      (error, response, body) => {
        resolve(body)
      }
    )
  }).then((user) => {
    request(
      process.env.APPT_SERVICE_URL + '/user/' + req.params.userId,
      { json: true },
      (error, response, body) => {
        res.render('user', {
          pageTitle: 'User Profile',
          user,
          appointments: body,
        })
      }
    )
  })
})

app.get('/users/:userId/edit', (req, res) => {
  if (!jwtVerify(req.cookies)) {
    return res.redirect('/')
  }

  request(
    process.env.USER_SERVICE_URL + '/' + req.params.userId,
    { json: true },
    (error, response, body) => {
      res.render('edit-user', {
        pageTitle: 'Edit User',
        user: body,
      })
    }
  )
})

app.post('/users/:userId/edit', (req, res) => {
  request.patch(
    {
      url: process.env.USER_SERVICE_URL + '/' + req.params.userId,
      body: req.fields,
      json: true,
    },
    (error, response, _) => {
      if (response.statusCode === 400) {
        res.redirect('/email-taken')
      } else {
        res.redirect('/users')
      }
    }
  )
})

app.post('/users/searchByLastName', (req, res) => {
  const lastName = req.fields.lastName

  request(
    process.env.USER_SERVICE_URL +
      '/searchByLastName/' +
      encodeURIComponent(lastName),
    { json: true },
    (error, response, body) => {
      res.render('list-users', {
        pageTitle: 'User List',
        userList: body,
      })
    }
  )
})

app.post('/users/searchByEmail', (req, res) => {
  const email = req.fields.email

  request(
    process.env.USER_SERVICE_URL +
      '/searchByEmail/' +
      encodeURIComponent(email),
    { json: true },
    (error, response, body) => {
      res.render('list-users', {
        pageTitle: 'User List',
        userList: body,
      })
    }
  )
})

app.post('/users/:userId/delete', (req, res) => {
  request.delete(process.env.USER_SERVICE_URL + '/' + req.params.userId)
})

app.get('/appointments', (req, res) => {
  if (!jwtVerify(req.cookies)) {
    return res.redirect('/')
  }

  request(
    process.env.APPT_SERVICE_URL,
    { json: true },
    (error, response, body) => {
      res.render('list-appts', {
        pageTitle: 'Appointment List',
        apptList: body,
      })
    }
  )
})

app.get('/appointments/create', (req, res) => {
  if (!jwtVerify(req.cookies)) {
    return res.redirect('/')
  }

  res.render('create-appt', {
    pageTitle: 'Create an Appointment',
  })
})

app.get('/user/:userId/appointments/create', (req, res) => {
  if (!jwtVerify(req.cookies)) {
    return res.redirect('/')
  }

  res.render('create-appt', {
    pageTitle: 'Create an Appointment',
    userId: req.params.userId,
  })
})

app.post('/appointments/create', (req, res) => {
  request.post(process.env.APPT_SERVICE_URL, {
    body: req.fields,
    json: true,
  })

  res.redirect('/users/' + req.fields.userId)
})

app.post('/appointments/search', (req, res) => {
  const apptName = req.fields.apptName
  request(
    process.env.APPT_SERVICE_URL + '/search/' + encodeURIComponent(apptName),
    { json: true },
    (error, response, body) => {
      res.render('list-appts', {
        pageTitle: 'Appointment List',
        apptList: body,
      })
    }
  )
})

app.get('/appointments/:apptId', (req, res) => {
  if (!jwtVerify(req.cookies)) {
    return res.redirect('/')
  }

  request(
    process.env.APPT_SERVICE_URL + '/' + req.params.apptId,
    { json: true },
    (error, response, body) => {
      res.render('appt', {
        pageTitle: 'Appointment Info',
        appt: body,
      })
    }
  )
})

app.get('/appointments/:apptId/edit', (req, res) => {
  if (!jwtVerify(req.cookies)) {
    return res.redirect('/')
  }

  request(
    process.env.APPT_SERVICE_URL + '/' + req.params.apptId,
    { json: true },
    (error, response, body) => {
      res.render('edit-appt', {
        pageTitle: 'Edit Appointment',
        appt: body,
      })
    }
  )
})

app.post('/appointments/:apptId/edit', (req, res) => {
  request.patch({
    url: process.env.APPT_SERVICE_URL + '/' + req.params.apptId,
    body: req.fields,
    json: true,
  })
  res.redirect('/appointments')
})

app.post('/appointments/:apptId/delete', (req, res) => {
  request.delete(process.env.APPT_SERVICE_URL + '/' + req.params.apptId)
})

app.listen(port, () => console.log(`Admin Service listening on port ${port}!`))
