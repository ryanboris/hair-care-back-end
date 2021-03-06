const express = require('express')
const database = require('../startup/db.js')
const router = express.Router()
const { authenticate } = require('../middleware/authentication.js')
const moment = require('moment')

/**
 * RESPONDS WITH AN ARRAY OF REVIEW OBJECTS
 */
router.get('/', authenticate, async (req, res) => {
	try {
		const data = await database('reviews')
		res.status(200).json(data)
	} catch (e) {
		console.log(e)
		res
			.status(500)
			.json({ error: 'An error occuried while trying to access the database.  Please try the request again.' })
	}
})

/**
 * RESPONDS WITH ONE REVIEW BASED ON REVIEW ID 
 */

router.get('/:id', authenticate, async (req, res) => {
	try {
		const byId = await database('comments').where('id', req.params.id)
		if (!byId) return res.status(404).json({ message: 'ID not found' })
		res.status(200).json(byId)
	} catch (error) {
		res.status(500).json({ error: 'An unexpected error has occuried.  Please try again.' })
	}
})

/**
 * RESPONDS WITH ALL THE REVIEW OBJECTS THAT HAVE THE SAME STYLIST_ID (ALL REVIEWS FOR A STYLIST) 
 */

router.get('/stylist/:id', async (req, res) => {
	const { id } = req.params
	try {
		const review = await database.select('*').from('reviews').where('stylist_id', id)
		!id ? res.status(404).json({ message: 'That user does not exist. ' }) : res.status(200).json(review)
	} catch (e) {
		console.log(e)
		res.status(500).json({ error: 'An unexpected error has occuried.  Please try again.' })
	}
})

/**
 * RESPONDS WITH THE SUCCESSFUL POST BODY (CONTAINS REVIEW SCHEMA AND STYLIST ID(WHAT STYLIST IT BELONGS TO)
 * AND ALSO CONTAINS WHICH USERNAME THE REVIEW WAS CREATED BY, WITH TIME CREATED AND TIME UPDATED TIMESTAMPS)
 */

router.post('/stylist/:id', authenticate, async (req, res) => {
	const { id } = req.params
	const { username } = req.decoded

	try {
		const getId = await database('stylists').where('id', id)
		if (!getId) return res.status(404).json({ message: 'Not found.' })
		try {
			const postIt = await database('reviews').insert({
				...req.body,
				stylist_id : id,
				comment_by : username,
			})
			res.status(201).json({ id: postIt, comment_by: username, stylist_id: id })
		} catch (error) {
			console.log(error)
			res.status(500).json({ error: 'An unexpected error has occuried.  Please try again.' })
		}
	} catch (error) {
		console.log(error)
		res.status(500).json({ error: 'An unexpected error has occuried.  Please try again.' })
	}
})

/**
 * THIS ROUTE DELETES ONE REVIEW BASED ON ITS REVIEW ID.  WHEN SUCCESSFUL IT RETURNS DELETEDID: 1 AND A SUCCESS MESSAGE.  IF ID NOT FOUND, IT RESPONDS WITH 404, ALL OTHER ERRORS RESPOND WITH 500.
 */

router.delete('/:id', authenticate, async (req, res) => {
	const { id } = req.params
	try {
		const count = await database('reviews').where('id', id).del()
		if (count === 0) return res.status(404).json({ message: 'ID not found.' })
		res.status(200).json({ count, deleted: 'The review was deleted successfully.' })
	} catch (error) {
		res.status(500).json({ error: 'An unexpected error has occuried.  Please try again.' })
	}
})

/**
 * THIS ALLOWS ONE REVIEW TO BE UPDATED BY ID.  SUPPLY A JSON IN THE REQUEST BODY WITH "REVIEW" KEY
 * SUCCESSFUL RESPONSE RETURNS 1:integer. REVIEW IS ALSO CHECKED BY USERNAME OF COMMENTED_BY IN ADDITION TO UNIQUE REVIEW ID--- ERRORS ARE HANDLED AS EXPECTED
 */

router.put('/:id', authenticate, async (req, res) => {
	const { id } = req.params
	const changes = req.body
	const { username } = req.decoded.username
	try {
		const count = await database('reviews').where('id', id)
		if (count.length <= 0 && count.review_by !== username)
			return res.status(404).json({ message: 'ID/User not found.' })
		try {
			if (!req.body.review) return res.status(400).json({ errorMessage: 'Please provide an updated review.' })
			const insert = await database('reviews')
				.where('id', id)
				.update({ ...changes, updated_at: moment().format('YYYY-DD-MM HH:mm:ss') })
			res.status(200).json({ insert, success: 'Success!' })
		} catch (error) {
			res.status(500).json({ error: 'An unexpected error has occuried.  Please try again.' })
		}
	} catch (error) {
		res.status(500).json({ error: 'An unexpected error has occuried.  Please try again.' })
	}
})

module.exports = router
