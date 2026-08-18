class ApiFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  // Filter documents
  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'search', 'sortBy'];
    excludedFields.forEach(el => delete queryObj[el]);

    // Advanced filtering for greater than, less than, etc.
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }

  // Sort documents - simplified since complex sorting is handled in services
  sort() {
    if (this.queryString.sort) {
      // Handle regular sort parameter
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      // Default sort
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  // Limit fields
  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  // Paginate results
  paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 10;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);
    return this;
  }

  // Search functionality
  search(searchFields = []) {
    if (this.queryString.search && searchFields.length > 0) {
      const searchQuery = {
        $or: searchFields.map(field => ({
          [field]: { $regex: this.queryString.search, $options: 'i' }
        }))
      };
      this.query = this.query.find(searchQuery);
    }
    return this;
  }
}

export default ApiFeatures;