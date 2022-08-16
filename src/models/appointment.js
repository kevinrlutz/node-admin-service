const mongoose = require('mongoose')
const validator = require('validator')

const apptSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		trim: true,
	},
	type: {
		type: String,
		required: true,
		trim: true,
	},
	description: {
		type: String,
		required: false,
		trim: true,
	},
	startTime: {
		type: String,
		required: false,
		default: new Date().toISOString(),
		trim: true,
	},
	endTime: {
		type: String,
		required: false,
		default: new Date().toISOString(),
		trim: true,
	},
	metadata: {
		type: String,
		required: false,
		trim: true,
		default: '',
	},
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		ref: 'User',
	},
})

const Appointment = mongoose.model('Appointment', apptSchema)

module.exports = Appointment
