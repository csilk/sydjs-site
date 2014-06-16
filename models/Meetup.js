var keystone = require('keystone'),
	Types = keystone.Field.Types;

/**
 * Meetups Model
 * =============
 */

var Meetup = new keystone.List('Meetup', {
	autokey: { path: 'key', from: 'name', unique: true }
});

Meetup.add({
	name: { type: String, required: true, initial: true },
	state: { type: Types.Select, options: 'draft, published, archived', default: 'draft', index: true },
	date: { type: Types.Date, required: true, initial: true, index: true },
	time: { type: String, required: true, initial: true, width: 'short', default: '6pm - 9pm', note: 'e.g. 6pm - 9pm' },
	place: { type: String, required: true, initial: true, width: 'medium', default: 'Level 6, 341 George St (Atlassian) – Enter via the side door in Wynyard Street', note: 'usually Level 6, 341 George St (Atlassian) – Enter via the side door in Wynyard Street' },
	description: { type: Types.Html, wysiwyg: true },
	maxRSVPs: { type: Number, default: 100 },
	totalRSVPs: { type: Number, noedit: true }
});




// Relationships
// ------------------------------

Meetup.relationship({ ref: 'Talk', refPath: 'meetup', path: 'talks' });
Meetup.relationship({ ref: 'RSVP', refPath: 'meetup', path: 'rsvps' });




// Virtuals
// ------------------------------

Meetup.schema.virtual('url').get(function() {
	return '/meetups/' + this.key;
});

Meetup.schema.virtual('remainingRSVPs').get(function() {
	if (!this.maxRSVPs) return -1;
	return Math.max(this.maxRSVPs - (this.totalRSVPs || 0), 0);
});

Meetup.schema.virtual('rsvpsAvailable').get(function() {
	return (this.remainingRSVPs != 0);
});



// Pre-Save
// ------------------------------

Meetup.schema.pre('save', function(next) {
	
	this.wasNew = this.isNew;
	
	next();
	
});




// Methods
// ------------------------------

Meetup.schema.methods.refreshRSVPs = function(callback) {
	
	var meetup = this;
	
	keystone.list('RSVP').model.count()
		.where('meetup').in([meetup.id])
		.where('attending', true)
		.exec(function(err, count) {
			
			if (err) return callback(err);
			
			meetup.totalRSVPs = count;
			meetup.save(callback);
			
		});
	
}

Meetup.schema.methods.notifySubscribers = function(req, res, next) {
	
	var meetup = this;
	
	keystone.list('User').model.find().where('notifications.meetups', true).exec(function(err, subscribers) {

		if (err) return next(err);
		
		if (!subscribers.length) {
			next();
		} else {
			subscribers.forEach(function(subscriber) {
				new keystone.Email('new-meetup').send({
					subscriber: subscriber,
					meetup: meetup,
					subject: 'New meetup: ' + meetup.name,
					to: subscriber.email,
					from: {
						name: 'SydJS',
						email: 'system@sydjs.com'
					}
				}, next);
			});
		}
		
	});
	
}


/**
 * Registration
 * ============
 */

Meetup.addPattern('standard meta');
Meetup.defaultSort = '-date';
Meetup.defaultColumns = 'name, state|20%, date|20%';
Meetup.register();
