// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import getSymbolFromCurrency from 'currency-symbol-map';
import SessionGateway from '../../gateways/Session.gateway';
import { getElementByField } from '../../utils/Cypress';
import { CypressFields } from '../../utils/enums/CypressFields';

const aliasGraphQLOperations = () => {
  cy.intercept('POST', '/api/graphql', req => {
    const { operationName } = req.body;

    switch (operationName) {
      case 'Products':
        req.alias = 'getProducts';
        break;

      case 'Currency':
        req.alias = 'getCurrencies';
        break;

      default:
        break;
    }
  });
};

describe('Home Page', () => {
  beforeEach(() => {
    aliasGraphQLOperations();
    cy.visit('/');
  });

  it('should validate the home page', () => {
    cy.wait('@getProducts');

    getElementByField(CypressFields.HomePage).should('exist');
    getElementByField(CypressFields.ProductCard, getElementByField(CypressFields.ProductList)).should('have.length', 10);

    getElementByField(CypressFields.SessionId).should('contain', SessionGateway.getSession().userId);
  });

  it('should change currency', () => {
    cy.wait('@getProducts');

    getElementByField(CypressFields.CurrencySwitcher).select('EUR');

    cy.wait('@getProducts');

    getElementByField(CypressFields.ProductCard, getElementByField(CypressFields.ProductList)).should('have.length', 10);
    getElementByField(CypressFields.CurrencySwitcher).should('have.value', 'EUR');
    getElementByField(CypressFields.ProductCard).should('contain', getSymbolFromCurrency('EUR'));
  });
});
