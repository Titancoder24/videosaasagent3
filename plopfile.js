const requireField = (fieldName) => {
  return (value) => {
    if (String(value).length === 0) {
      return fieldName + "is required";
    }
    return true;
  };
};

module.exports = function (plop) {
  plop.setGenerator("controller", {
    description: "Generate a new controller",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "What is name of your controllers? ",
        validate: requireField("name"),
      },
    ],
    actions: [
      {
        type: "add",
        path: "src/models/{{camelCase name}}Schema.js",
        templateFile: "plop-templates/model.js.hbs",
      },
      {
        type: "add",
        path: "src/controllers/{{camelCase name}}Controller.js",
        templateFile: "./plop-templates/controller.js.hbs",
      },
      {
        type: "add",
        path: "src/validators/{{camelCase name}}Validator.js",
        templateFile: "plop-templates/validations.js.hbs",
      },
      {
        type: "add",
        path: "src/routers/{{camelCase name}}Router.js",
        templateFile: "plop-templates/routes.js.hbs",
      },
    ],
  });
};
