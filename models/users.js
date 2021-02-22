'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class users extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  };
  users.init({
    user_id: DataTypes.INTEGER,
    api_key: DataTypes.STRING,
    secret: DataTypes.STRING,
    is_bot: DataTypes.BOOLEAN,
    first_name: DataTypes.STRING,
    last_name: DataTypes.STRING,
    username: DataTypes.STRING,
    language_code: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'users',
  });
  return users;
};