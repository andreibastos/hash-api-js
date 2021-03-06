var periodEnum = require('../enums/periodEnum'),
    cacheTTLenum = require('../enums/cacheTTLenum'),
    _ = require('underscore');

module.exports = function(FlickrPhoto) {

  var args = [
    // TODO: Implement ElasticSearch Search query
    // https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html
    { arg: 'period', type: 'string' },
    { arg: 'filter', type: '[string]', http: { source: 'query' } },
    { arg: 'page', type: 'number' },
    { arg: 'per_page', type: 'number' }
  ];

  // TODO: implement httpArgsMapping

  FlickrPhoto.remoteMethod('findByArgs', {
    accepts: args,
    returns: { type: 'array', root: true },
    http: { path: '/', verb: 'GET' }
  });

  FlickrPhoto.remoteMethod('countByArgs', {
    accepts: args,
    returns: { type: 'object', root: true },
    http: { path: '/count', verb: 'GET' }
  });

  function dealWith(type, property, object) {
    switch (type) {
      case 'array':
        return _.isEmpty(object[property])
          ? null
          : _.isArray(object[property])
            ? object[property]
            : [object[property]];
      default:
        throw new Error('type not supported!');
        break;
    }
  }

  FlickrPhoto.findByArgs = function(period, filter, page, perPage, cb) {
    period = _.isEmpty(period) ? 'P1D' : period;
    page = _.isEmpty(page) ? 1 : page;
    perPage = _.isEmpty(perPage) ? 25 : perPage > 100 ? 100 : perPage;
    filter = _.isEmpty(filter) ? {} : filter;
    ['with_tags', 'contain_tags', 'has']
      .forEach(function (property) {
        filter[property] = dealWith('array', property, filter);
      });

    var query = {
      where: {},
      order: 'dates.posted DESC',
      limit: perPage * page,
      skip: (perPage * page) - perPage
    };

    if(!_.isEmpty(period))
      query.where['dates.posted'] = {
        between: [
          (new Date(new Date() - periodEnum[period]).getTime() / 1000).toFixed(),
          (new Date().getTime() / 1000).toFixed()
        ]
      }

    if(!_.isEmpty(filter['has'])) {
      if(filter['has'].indexOf('description') > -1)
        query.where['description._content'] = { $exists: true };
      if(filter['has'].indexOf('title') > -1)
        query.where['title._content'] = { $exists: true };
      if(filter['has'].indexOf('people') > -1)
        query.where['people.haspeople'] = { $gt: 0 };
      if(filter['has'].indexOf('tags') > -1)
        query.where['tags.tag.0'] = { $exists: true };
    }

    if(!_.isEmpty(filter['with_tags'])) {
      query.where.and = _.isEmpty(query.where.and) ? [] : query.where.and;
      filter['with_tags'].forEach(function (tag) {
        query.where.and.push({ 'tags.tag._content': tag });
      });
    }

    if(!_.isEmpty(filter['contain_tags'])) {
      query.where.or = [];
      filter['contain_tags'].forEach(function (tag) {
        query.where.or.push({ 'tags.tag._content': tag });
      });
    }

    console.info('findByArgs query: \n%j', query);

    FlickrPhoto.find(query, function(err, docs) {
      if (err) return cb(err, null);

      // FlickrPhoto.cache.put(options.cache.key, docs, options.cache.ttl);
      return cb(null, docs);
    });
  }

  FlickrPhoto.countByArgs = function(period, filter, page, perPage, cb) {
    period = _.isEmpty(period) ? 'P1D' : period;
    filter = _.isEmpty(filter) ? {} : filter;
    ['with_tags', 'contain_tags', 'has']
      .forEach(function (property) {
        filter[property] = dealWith('array', property, filter);
      });

    var query = {};

    // if(_.isEmpty(filter['blocked']))
    //   query.block = false;

    if(!_.isEmpty(period))
      query['dates.posted'] = {
        $gte: (new Date(new Date() - periodEnum[period]).getTime() / 1000).toFixed(),
        $lte: (new Date().getTime() / 1000).toFixed()
      }

    if(!_.isEmpty(filter['has'])) {
      if(filter['has'].indexOf('description') > -1)
        query['description._content'] = { $exists: true };
      if(filter['has'].indexOf('title') > -1)
        query['title._content'] = { $exists: true };
      if(filter['has'].indexOf('people') > -1)
        query['people.haspeople'] = { $gt: 0 };
      if(filter['has'].indexOf('tags') > -1)
        query['tags.tag.0'] = { $exists: true };
    }

    if(!_.isEmpty(filter['with_tags']))
      query['tags.tag._content'] = { $all: filter['with_tags'] };

    if(!_.isEmpty(filter['contain_tags']))
      query['tags.tag._content'] = { $in: filter['contain_tags'] };

    console.info('countByArgs query: \n%j', query);

    return FlickrPhoto.dao.mongodb.count(query, function(err, result) {
      if (err) return cb(err, null);

      return cb(null, { count: result });
    });
  }
};
