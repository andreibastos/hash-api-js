var _ = require('../../../lib/underscoreExtended');

module.exports = function mostPopularHashtags(params, model, cb) { 
  var pipeline = [
    { $match: {
      'status.entities.hashtags.0': { $exists: true },
      'status.timestamp_ms': {
        $gte: params.since.getTime(),
        $lte: params.until.getTime()
      },
      // block: (params.filter.blocked || false) 
    } },
    { $unwind: '$status.entities.hashtags' },
    { $group: {
      _id: '$status.entities.hashtags.text',
      count: { $sum: 1 }
    } },
    { $sort: { count: -1 } },
    { $project: {
      _id: 0,
      hashtag: '$_id',
      count: '$count'
    } }, 
    { $limit: params.perPage * params.page }, 
    { $skip : (params.perPage * params.page) - params.perPage } 
  ];

  if(params.filter.tags) {
    if(params.filter.tags.with)
      pipeline[0].$match['categories'] = { $all: params.filter.tags.with };

    if(params.filter.tags.contains)
      pipeline[0].$match['categories'] = { $in: params.filter.tags.contains };
  }

  if(params.filter.hashtags)
    pipeline[0].$match['status.entities.hashtags.text'] = { $in: params.filter.hashtags };

  if(params.filter.mentions)
    pipeline[0].$match['status.entities.user_mentions.screen_name'] = { $in: params.filter.mentions };

  if(params.filter.users)
    pipeline[0].$match['status.user.screen_name'] = { $in: params.filter.users };

  if(params.filter.retweeted)
    pipeline[0].$match['status.retweeted_status'] = { $exists: params.filter.retweeted };

  if(_.isBoolean(params.filter.blocked))
    pipeline[0].$match['block'] = params.filter.blocked;

  model.dao.mongodb.aggregate(pipeline, cb);
};