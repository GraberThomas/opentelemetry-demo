// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import { getElementByField } from '../../utils/Cypress';
import { CypressFields } from '../../utils/enums/CypressFields';

const aliasGraphQLOperations = () => {
  cy.intercept('POST', '/api/graphql', req => {
    const { operationName } = req.body;

    switch (operationName) {
      case 'Product':
        req.alias = 'getProduct';
        break;

      case 'Ads':
        req.alias = 'getAd';
        break;

      case 'Recommendations':
        req.alias = 'getRecommendations';
        break;

      case 'ProductReviews':
        req.alias = 'getProductReviews';
        break;

      case 'AddItem':
        req.alias = 'addToCart';
        break;

      case 'Cart':
        req.alias = 'getCart';
        break;

      default:
        break;
    }
  });
};

describe('Product Detail Page', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should validate the product detail page', () => {
    aliasGraphQLOperations();

    getElementByField(CypressFields.ProductCard).first().click();

    cy.wait('@getProduct');
    cy.wait('@getAd');
    cy.wait('@getRecommendations');
    cy.wait('@getProductReviews');

    getElementByField(CypressFields.ProductDetail).should('exist');
    getElementByField(CypressFields.ProductPicture).should('exist');
    getElementByField(CypressFields.ProductName).should('exist');
    getElementByField(CypressFields.ProductDescription).should('exist');
    getElementByField(CypressFields.ProductAddToCart).should('exist');

    getElementByField(CypressFields.ProductCard, getElementByField(CypressFields.RecommendationList)).should(
      'have.length',
      4
    );
    getElementByField(CypressFields.Ad).should('exist');
    getElementByField(CypressFields.ProductReviews).should('exist');
  });

  it('should not render product picture or request undefined image when picture is missing', () => {
    cy.intercept('POST', '/api/graphql', req => {
      if (req.body.operationName === 'Product') {
        req.alias = 'getProduct';

        req.continue(res => {
          if (res.body?.data?.product) {
            delete res.body.data.product.picture;
          }
        });
      }
    });

    cy.intercept('GET', '/images/products/undefined').as('undefinedImage');

    getElementByField(CypressFields.ProductCard).first().click();
    cy.wait('@getProduct');

    getElementByField(CypressFields.ProductDetail).should('exist');
    getElementByField(CypressFields.ProductPicture).should('not.exist');
    getElementByField(CypressFields.ProductName).should('exist');
    getElementByField(CypressFields.ProductDescription).should('exist');
    getElementByField(CypressFields.ProductAddToCart).should('exist');

    cy.get('@undefinedImage.all').should('have.length', 0);
  });

  it('should add item to cart', () => {
    aliasGraphQLOperations();

    getElementByField(CypressFields.ProductCard).first().click();
    getElementByField(CypressFields.ProductAddToCart).click();

    cy.wait('@addToCart');
    cy.wait('@getCart', { timeout: 10000 });
    cy.wait(2000);
    cy.location('href').should('match', /\/cart$/);

    getElementByField(CypressFields.CartItemCount).should('contain', '1');
    getElementByField(CypressFields.CartIcon).click({ force: true });

    getElementByField(CypressFields.CartDropdownItem).should('have.length', 1);
  });
});

export {};
