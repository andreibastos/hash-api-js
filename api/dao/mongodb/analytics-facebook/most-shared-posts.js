module.exports = function mostSharedPosts(params, model, cb) { 
  var query = {
    'created_time_ms': {
      $gte: params.since.getTime(),
      $lte: params.until.getTime()
    }
  }

  var options = {
    sort: [['shares_count', -1]],
    limit: params.perPage * params.page,
    skip: (params.perPage * params.page) - params.perPage
  }

  if(params.filter.tags) {
    if(params.filter.tags.with)
      query['categories'] = { $all: params.filter.tags.with };

    if(params.filter.tags.contains)
      query['categories'] = { $in: params.filter.tags.contains };
  }

  if(params.filter.hashtags)
    query['hashtags'] = { $in: params.filter.hashtags };

  if(params.filter.mentions) {
    query['message_tags.id'] = { $in: params.filter.mentions };
    query['with_tags.id'] = { $in: params.filter.mentions };
  }

  if(params.filter.profiles)
    query['from.id'] = { $in: params.filter.profiles };

  if(params.filter.postType)
    query['type'] = { $in: params.filter.postType };

  model.dao.mongodb.find(query, options, cb);
};