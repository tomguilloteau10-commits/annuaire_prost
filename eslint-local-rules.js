// Point d'entrée attendu par eslint-plugin-local-rules. Les règles vivent
// dans eslint-rules/ pour rester lisibles et testables séparément.
module.exports = {
  "no-sensitive-log-fields": require("./eslint-rules/no-sensitive-log-fields"),
};
