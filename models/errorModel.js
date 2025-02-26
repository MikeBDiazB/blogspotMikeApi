class HttpError extends Error {
constructor (message, errorCode){
    super(message);
    this.cpde = errorCode
}

}

module.exports = HttpError;