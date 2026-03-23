// server/services/BaseService.js


class BaseService {
  /**
   * Logs and throws a formatted error
   * @param {Error} error - The error to log and throw
   * @param {Object} context - Additional context for the error
   */
  handleError(error, context) {
    console.error(`Error: ${error.message}`, context);
    throw error;
  }

  /**
   * Validates that required fields exist in the data
   * @param {Object} data - The data to validate
   * @param {Array<string>} fields - The required fields
   */
  validateRequired(data, fields) {
    fields.forEach((field) => {
      if (!data[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    });
  }

  /**
   * Formats a response with a standard structure
   * @param {Object} data - The data to format
   * @param {string} message - The message to include in the response
   */
  formatResponse(data, message) {
    return {
      success: true,
      message,
      data,
    };
  }
}

module.exports = BaseService;
