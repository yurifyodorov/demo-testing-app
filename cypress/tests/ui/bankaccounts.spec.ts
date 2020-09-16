import { User } from "../../../src/models";
import { isMobile } from "../../support/utils";

type BankAccountsTestCtx = {
  user?: User;
};

describe("Bank Accounts", function () {
  const ctx: BankAccountsTestCtx = {};

  beforeEach(function () {
    cy.task("db:seed");

    cy.server();
    cy.route("POST", "/bankAccounts").as("createBankAccount");
    cy.route("DELETE", "/bankAccounts/*").as("deleteBankAccount");
    cy.route("GET", "/notifications").as("getNotifications");

    cy.database("find", "users").then((user: User) => {
      ctx.user = user;

      return cy.loginByXstate(ctx.user.username);
    });
  });

  it("creates a new bank account", function () {
    cy.wait("@getNotifications");
    if (isMobile()) {
      cy.getBySel("sidenav-toggle").click();
    }

    cy.getBySel("sidenav-bankaccounts").click();

    cy.getBySel("bankaccount-new").click();
    cy.location("pathname").should("eq", "/bankaccounts/new");
    cy.percySnapshot("Display New Bank Account Form");

    cy.getBySelLike("bankName-input").type("The Best Bank");
    cy.getBySelLike("routingNumber-input").type("987654321");
    cy.getBySelLike("accountNumber-input").type("123456789");
    cy.percySnapshot("Fill out New Bank Account Form");
    cy.getBySelLike("submit").click();

    cy.wait("@createBankAccount");

    cy.getBySelLike("bankaccount-list-item")
      .should("have.length", 2)
      .eq(1)
      .should("contain", "The Best Bank");
    cy.percySnapshot("Bank Account Created");
  });

  it("should display bank account form errors", function () {
    cy.visit("/bankaccounts");
    cy.getBySel("bankaccount-new").click();

    cy.getBySelLike("bankName-input").type("The").find("input").clear().blur();
    cy.get("#bankaccount-bankName-input-helper-text")
      .should("be.visible")
      .and("contain", "Enter a bank name");

    cy.getBySelLike("bankName-input").type("The").find("input").blur();
    cy.get("#bankaccount-bankName-input-helper-text")
      .should("be.visible")
      .and("contain", "Must contain at least 5 characters");

    ["routing", "account"].forEach((field) => {
      cy.getBySelLike(`${field}Number-input`).type("123").find("input").clear().blur();
      cy.get(`#bankaccount-${field}Number-input-helper-text`)
        .should("be.visible")
        .and("contain", `Enter a valid bank ${field} number`);

      cy.getBySelLike(`${field}Number-input`).type("12345678").find("input").blur();
      cy.get(`#bankaccount-${field}Number-input-helper-text`)
        .should("be.visible")
        .and("contain", `Must contain a valid ${field} number`);
    });

    cy.getBySel("bankaccount-submit").should("be.disabled");
    cy.percySnapshot("Bank Account Form with Errors and Submit button disabled");
  });

  it("soft deletes a bank account", function () {
    cy.visit("/bankaccounts");
    cy.getBySelLike("delete").first().click();

    cy.wait("@deleteBankAccount");
    cy.getBySelLike("list-item").children().contains("Deleted");
    cy.percySnapshot("Soft Delete Bank Account");
  });

  // TODO: [enhancement] the onboarding modal assertion can be removed after adding "onboarded" flag to user profile
  it("renders an empty bank account list state with onboarding modal", function () {
    cy.route("GET", "/bankAccounts", []).as("getBankAccounts");

    cy.visit("/bankaccounts");
    cy.wait("@getBankAccounts");

    cy.getBySel("bankaccount-list").should("not.be.visible");
    cy.getBySel("empty-list-header").should("contain", "No Bank Accounts");
    cy.getBySel("user-onboarding-dialog").should("be.visible");
    cy.percySnapshot("User Onboarding Dialog is Visible");
  });
});
