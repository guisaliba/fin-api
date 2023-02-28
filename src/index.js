const express = require("express");
const { v4: uuidv4 } = require("uuid");
const app = express();

// Middleware

app.use(express.json());

// Array de usuários existentes no aplicativo;

const users = [];

// Função para verificar se o usuário existe por meio do CPF.

function verifyAccountExists(request, response, next) {
  const { cpf } = request.headers;

  const user = users.find((user) => user.cpf === cpf);
  if (!user) {
    return response.status(400).json({ error: "Usuário não cadastrado." });
  }
  request.user = user;
  return next();
}

// Função para fazer o balanço do extrato bancário do usuário;
function getBalance(statement) {
  let balance;
  balance = statement.reduce((acc, operation) => {
    if (operation.type === "credit") {
      return acc + operation.amount;
    } else {
      return acc - operation.amount;
    }
  }, 0);

  return balance;
}

// Requisição para cadastrar um novo usuário;

app.post("/newaccount", (request, response) => {
  const { cpf, name } = request.body;
  const userAlreadyExists = users.some((user) => user.cpf === cpf);

  if (userAlreadyExists) {
    return response.status(400).json({ error: "Usuário já cadastrado." });
  }

  const id = uuidv4();
  users.push({
    cpf,
    name,
    id: uuidv4(undefined, undefined, undefined),
    statement: [],
  });
  return response.status(201).send();
});

// Requisição para obter o extrato bancário de um único usuário já cadastrado;

app.get("/statement", verifyAccountExists, (request, response) => {
  const { user } = request;

  return response.json(user.statement);
});

// Requisição para obter o extrato bancário de um único usuário já cadastrado pela data desejada;

app.get("/statement/date", verifyAccountExists, (request, response) => {
  const { user } = request;
  const { date } = request.query;

  const dateFormat = new Date(date + " 00:00");
  const statement = user.statement.filter(
    (statement) =>
      statement.created_at.toDateString() ===
      new Date(dateFormat).toDateString()
  );

  return response.json(statement);
});

// Requisição para obter o saldo da conta bancária de um usuário já cadastrado;

app.get("/balance", verifyAccountExists, (request, response) => {
  const { user } = request;

  const balance = getBalance(user.statement);

  return response.json(balance);
});

// Requisição para obter os dados da conta de um único usuário já cadastrado;

app.get("/account", verifyAccountExists, (request, response) => {
  const { user } = request;

  return response.json(user);
});

// Requisição para depositar fundos no extrato bancário de um usuário já cadastrado;

app.post("/deposit", verifyAccountExists, (request, response) => {
  const { description, amount } = request.body;
  const { user } = request;
  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: "credit",
  };

  user.statement.push(statementOperation);
  return response.status(201).send();
});

// Requisição para retirar fundos do extrato bancário de um usuário já cadastrado;

app.post("/withdraw", verifyAccountExists, (request, response) => {
  const { description, amount } = request.body;
  const { user } = request;
  const balance = getBalance(user.statement);

  if (balance < amount) {
    return response.status(400).json({ err: "Saldo insuficiente." });
  }

  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: "debit",
  };

  user.statement.push(statementOperation);
  return response.status(201).send();
});

// Requisição para atualizar os dados (apenas nome) da conta de um único usuário já cadastrado;

app.put("/account", verifyAccountExists, (request, response) => {
  const { name } = request.body;
  const { user } = request;

  user.name = name;

  return response.status(201).send();
});

// Requisição para deletar a conta de um usuário já cadastrado;

app.delete("/account", verifyAccountExists, (request, response) => {
  const { user } = request;

  users.splice(user, 1);

  return response.status(200).json(users);
});

app.listen(3333);
