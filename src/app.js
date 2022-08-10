const express = require('express')
const app = express()
const path = require('path')
const hbs = require('hbs')

hbs.registerHelper('dateFormat', require('handlebars-dateformat'))

const request = require('postman-request')
const port = process.env.PORT
const formidable = require('express-formidable')
const mongoose = require('mongoose')

const publicDirPath = path.join(__dirname, '../public')
const viewPath = path.join(__dirname, '../templates/views')
const partialsPath = path.join(__dirname, '../templates/partials')

app.set('view engine', 'hbs')
app.set('views', viewPath)
hbs.registerPartials(partialsPath)

app.use(formidable())

app.use(express.static(publicDirPath))

app.get('/', (req, res) => {
	res.render('index', {
		pageTitle: 'Appointment Manager',
	})
})

app.get('/appointments', (req, res) => {
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
	res.render('create-appt', {
		pageTitle: 'Create an Appointment',
	})
})

app.post('/appointments/create', (req, res) => {
	req.fields.userId = new mongoose.Types.ObjectId()

	request.post(process.env.APPT_SERVICE_URL, {
		body: req.fields,
		json: true,
	})

	res.redirect('/appointments')
})

app.get('/appointments/:apptId', (req, res) => {
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
