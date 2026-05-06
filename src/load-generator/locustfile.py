#!/usr/bin/python

# Copyright The OpenTelemetry Authors
# SPDX-License-Identifier: Apache-2.0

import json
import os
import random
import uuid
import logging

from locust import HttpUser, task, between
from locust_plugins.users.playwright import PlaywrightUser, pw, PageWithRetry, event

from opentelemetry import context, baggage, trace
from opentelemetry.context import Context
from opentelemetry.metrics import set_meter_provider
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.jinja2 import Jinja2Instrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.instrumentation.system_metrics import SystemMetricsInstrumentor
from opentelemetry.instrumentation.urllib3 import URLLib3Instrumentor
from opentelemetry.instrumentation.logging import LoggingInstrumentor
from opentelemetry._logs import set_logger_provider
from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.sdk.resources import Resource

from openfeature import api
from openfeature.contrib.provider.ofrep import OFREPProvider
from openfeature.contrib.hook.opentelemetry import TracingHook

from playwright.async_api import Route, Request

# Configure tracer provider first (needed for trace context in logs)
tracer_provider = TracerProvider()
trace.set_tracer_provider(tracer_provider)
tracer_provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(insecure=True)))

# Configure logger provider with the same resource
logger_provider = LoggerProvider()
set_logger_provider(logger_provider)

# Set up log exporter and processor
log_exporter = OTLPLogExporter(insecure=True)
logger_provider.add_log_record_processor(BatchLogRecordProcessor(log_exporter))

# Create logging handler that will include trace context
handler = LoggingHandler(level=logging.INFO, logger_provider=logger_provider)

# Configure root logger
root_logger = logging.getLogger()
root_logger.addHandler(handler)
root_logger.setLevel(logging.INFO)

# Configure metrics
metric_exporter = OTLPMetricExporter(insecure=True)
set_meter_provider(MeterProvider([PeriodicExportingMetricReader(metric_exporter)]))

# Instrument logging to automatically inject trace context
LoggingInstrumentor().instrument(set_logging_format=True)

# Instrumenting manually to avoid error with locust gevent monkey
Jinja2Instrumentor().instrument()
RequestsInstrumentor().instrument()
SystemMetricsInstrumentor().instrument()
URLLib3Instrumentor().instrument()

logging.info("Instrumentation complete - logs will now include trace context")

# Initialize Flagd provider
base_url = f"http://{os.environ.get('FLAGD_HOST', 'localhost')}:{os.environ.get('FLAGD_OFREP_PORT', 8016)}"
api.set_provider(OFREPProvider(base_url=base_url))
api.add_hooks([TracingHook()])

def get_flagd_value(FlagName):
    # Initialize OpenFeature
    client = api.get_client()
    return client.get_integer_value(FlagName, 0)

categories = [
    "binoculars",
    "telescopes",
    "accessories",
    "assembly",
    "travel",
    "books",
    None,
]

products = [
    "0PUK6V6EV0",
    "1YMWWN1N4O",
    "2ZYFJ3GM2N",
    "66VCHSJNUP",
    "6E92ZMYYFZ",
    "9SIQT8TOJO",
    "L9ECAV7KIM",
    "LS4PSXUNUM",
    "OLJCESPC7Z",
    "HQTGWGPNH4",
]

people_file = open("people.json")
people = json.load(people_file)


PRODUCT_QUERY = """
query Product($productId: ID!, $currencyCode: String = "USD") {
  product(id: $productId) {
    id
    name
    description
    picture
    categories
    priceUsd: price(currencyCode: $currencyCode) {
      currencyCode
      units
      nanos
    }
  }
}
"""

RECOMMENDATIONS_QUERY = """
query Recommendations($userId: ID!, $productIds: [ID!]!, $currencyCode: String = "USD") {
  recommendations(userId: $userId, productIds: $productIds) {
    id
    name
    description
    picture
    categories
    priceUsd: price(currencyCode: $currencyCode) {
      currencyCode
      units
      nanos
    }
  }
}
"""

PRODUCT_REVIEWS_QUERY = """
query ProductReviews($productId: ID!) {
  product(id: $productId) {
    reviews {
      username
      description
      score
    }
  }
}
"""

PRODUCT_AI_REVIEW_SUMMARY_QUERY = """
query ProductAiReviewSummary($productId: ID!, $question: String!) {
  product(id: $productId) {
    aiReviewSummary(question: $question)
  }
}
"""

ADS_QUERY = """
query Ads($contextKeys: [String!]!) {
  ads(contextKeys: $contextKeys) {
    text
    redirectUrl
  }
}
"""

CART_QUERY = """
query Cart($userId: ID!, $currencyCode: String = "USD") {
  cart(userId: $userId) {
    userId
    items {
      productId
      quantity
      product {
        id
        name
        description
        picture
        categories
        priceUsd: price(currencyCode: $currencyCode) {
          currencyCode
          units
          nanos
        }
      }
    }
  }
}
"""

ADD_ITEM_MUTATION = """
mutation AddItem($userId: ID!, $item: CartItemInput!) {
  addItem(userId: $userId, item: $item) {
    userId
    items {
      productId
      quantity
    }
  }
}
"""

PLACE_ORDER_MUTATION = """
mutation PlaceOrder($input: PlaceOrderInput!, $currencyCode: String = "USD") {
  placeOrder(input: $input) {
    orderId
    shippingTrackingId
    shippingCost {
      currencyCode
      units
      nanos
    }
    shippingAddress {
      streetAddress
      city
      state
      country
      zipCode
    }
    items {
      productId
      quantity
      cost {
        currencyCode
        units
        nanos
      }
      product {
        id
        name
        description
        picture
        categories
        priceUsd: price(currencyCode: $currencyCode) {
          currencyCode
          units
          nanos
        }
      }
    }
  }
}
"""


def graphql_request(client, operation_name, query, variables=None):
    with client.post(
        "/api/graphql",
        json={
            "operationName": operation_name,
            "query": query,
            "variables": variables or {},
        },
        name=f"GraphQL {operation_name}",
        catch_response=True,
    ) as response:
        try:
            payload = response.json()
        except ValueError:
            response.failure("GraphQL response is not valid JSON")
            return response

        if response.status_code >= 400:
            response.failure(f"GraphQL HTTP error: {response.status_code}")
            return response

        if payload.get("errors"):
            response.failure(f"GraphQL errors: {payload['errors']}")
            return response

        response.success()
        return response


class WebsiteUser(HttpUser):
    wait_time = between(1, 10)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.tracer = trace.get_tracer(__name__)

    @task(1)
    def index(self):
        with self.tracer.start_as_current_span("user_index", context=Context()):
            logging.info("User accessing index page")
            self.client.get("/")

    @task(10)
    def browse_product(self):
        product = random.choice(products)
        with self.tracer.start_as_current_span(
            "user_browse_product",
            context=Context(),
            attributes={"product.id": product},
        ):
            logging.info(f"User browsing product: {product}")
            graphql_request(
                self.client,
                "Product",
                PRODUCT_QUERY,
                {
                    "productId": product,
                    "currencyCode": "USD",
                },
            )

    @task(3)
    def get_recommendations(self):
        product = random.choice(products)
        user = str(uuid.uuid1())
        with self.tracer.start_as_current_span(
            "user_get_recommendations",
            context=Context(),
            attributes={"product.id": product, "user.id": user},
        ):
            logging.info(f"User getting recommendations for product: {product}")
            graphql_request(
                self.client,
                "Recommendations",
                RECOMMENDATIONS_QUERY,
                {
                    "userId": user,
                    "productIds": [product],
                    "currencyCode": "USD",
                },
            )

    @task(2)
    def get_product_reviews(self):
        product = random.choice(products)
        with self.tracer.start_as_current_span(
            "user_get_product_reviews",
            context=Context(),
            attributes={"product.id": product},
        ):
            logging.info(f"User getting product reviews for product: {product}")
            graphql_request(
                self.client,
                "ProductReviews",
                PRODUCT_REVIEWS_QUERY,
                {
                    "productId": product,
                },
            )

    @task(1)
    def ask_product_ai_assistant(self):
        product = random.choice(products)
        question = "Can you summarize the product reviews?"
        with self.tracer.start_as_current_span(
            "user_ask_product_ai_assistant",
            context=Context(),
            attributes={"product.id": product, "question": question},
        ):
            logging.info(f"Asking the AI Assistant a question for: {product} {question}")
            graphql_request(
                self.client,
                "ProductAiReviewSummary",
                PRODUCT_AI_REVIEW_SUMMARY_QUERY,
                {
                    "productId": product,
                    "question": question,
                },
            )

    @task(3)
    def get_ads(self):
        category = random.choice(categories)
        context_keys = [] if category is None else [category]

        with self.tracer.start_as_current_span(
            "user_get_ads",
            context=Context(),
            attributes={"category": str(category)},
        ):
            logging.info(f"User getting ads for category: {category}")
            graphql_request(
                self.client,
                "Ads",
                ADS_QUERY,
                {
                    "contextKeys": context_keys,
                },
            )

    @task(3)
    def view_cart(self):
        user = str(uuid.uuid1())
        with self.tracer.start_as_current_span(
            "user_view_cart",
            context=Context(),
            attributes={"user.id": user},
        ):
            logging.info(f"User viewing cart: {user}")
            graphql_request(
                self.client,
                "Cart",
                CART_QUERY,
                {
                    "userId": user,
                    "currencyCode": "USD",
                },
            )

    @task(2)
    def add_to_cart(self, user=""):
        if user == "":
            user = str(uuid.uuid1())

        product = random.choice(products)
        quantity = random.choice([1, 2, 3, 4, 5, 10])

        with self.tracer.start_as_current_span(
            "user_add_to_cart",
            context=Context(),
            attributes={
                "user.id": user,
                "product.id": product,
                "quantity": quantity,
            },
        ):
            logging.info(f"User {user} adding {quantity} of product {product} to cart")

            graphql_request(
                self.client,
                "Product",
                PRODUCT_QUERY,
                {
                    "productId": product,
                    "currencyCode": "USD",
                },
            )

            graphql_request(
                self.client,
                "AddItem",
                ADD_ITEM_MUTATION,
                {
                    "userId": user,
                    "item": {
                        "productId": product,
                        "quantity": quantity,
                    },
                },
            )

    @task(1)
    def checkout(self):
        user = str(uuid.uuid1())
        with self.tracer.start_as_current_span(
            "user_checkout_single",
            context=Context(),
            attributes={"user.id": user},
        ):
            self.add_to_cart(user=user)

            checkout_person = dict(random.choice(people))
            checkout_person["userId"] = user
            currency_code = checkout_person.get("userCurrency", "USD")

            graphql_request(
                self.client,
                "PlaceOrder",
                PLACE_ORDER_MUTATION,
                {
                    "input": checkout_person,
                    "currencyCode": currency_code,
                },
            )

            logging.info(f"Checkout completed for user {user}")

    @task(1)
    def checkout_multi(self):
        user = str(uuid.uuid1())
        item_count = random.choice([2, 3, 4])

        with self.tracer.start_as_current_span(
            "user_checkout_multi",
            context=Context(),
            attributes={"user.id": user, "item.count": item_count},
        ):
            for _ in range(item_count):
                self.add_to_cart(user=user)

            checkout_person = dict(random.choice(people))
            checkout_person["userId"] = user
            currency_code = checkout_person.get("userCurrency", "USD")

            graphql_request(
                self.client,
                "PlaceOrder",
                PLACE_ORDER_MUTATION,
                {
                    "input": checkout_person,
                    "currencyCode": currency_code,
                },
            )

            logging.info(f"Multi-item checkout completed for user {user}")

    @task(5)
    def flood_home(self):
        flood_count = get_flagd_value("loadGeneratorFloodHomepage")
        if flood_count > 0:
            with self.tracer.start_as_current_span(
                "user_flood_home",
                context=Context(),
                attributes={"flood.count": flood_count},
            ):
                logging.info(f"User flooding homepage {flood_count} times")
                for _ in range(0, flood_count):
                    self.client.get("/")

    def on_start(self):
        with self.tracer.start_as_current_span("user_session_start", context=Context()):
            session_id = str(uuid.uuid4())
            logging.info(f"Starting user session: {session_id}")
            ctx = baggage.set_baggage("session.id", session_id)
            ctx = baggage.set_baggage("synthetic_request", "true", context=ctx)
            context.attach(ctx)
            self.index()


browser_traffic_enabled = os.environ.get("LOCUST_BROWSER_TRAFFIC_ENABLED", "").lower() in ("true", "yes", "on")

if browser_traffic_enabled:
    class WebsiteBrowserUser(PlaywrightUser):
        headless = True  # to use a headless browser, without a GUI

        @task
        @pw
        async def open_cart_page_and_change_currency(self, page: PageWithRetry):
            tracer = trace.get_tracer(__name__)
            with tracer.start_as_current_span("browser_change_currency", context=Context()):
                try:
                    page.on("console", lambda msg: print(msg.text))
                    await page.route("**/*", add_baggage_header)
                    await page.goto("/cart", wait_until="domcontentloaded")
                    await page.select_option('[name="currency_code"]', "CHF")
                    await page.wait_for_timeout(2000)  # giving the browser time to export the traces
                    logging.info("Currency changed to CHF")
                except Exception as e:
                    logging.error(f"Error in change currency task: {str(e)}")

        @task
        @pw
        async def add_product_to_cart(self, page: PageWithRetry):
            tracer = trace.get_tracer(__name__)
            with tracer.start_as_current_span("browser_add_to_cart", context=Context()):
                try:
                    page.on("console", lambda msg: print(msg.text))
                    await page.route("**/*", add_baggage_header)
                    await page.goto("/", wait_until="domcontentloaded")
                    # Wait for Roof Binoculars image to load (awaiting successful XHR response in less than 15 seconds)
                    await page.wait_for_event(
                        "response",
                        predicate=lambda r: "/images/products/RoofBinoculars.jpg" in r.url and r.status == 200,
                        timeout=15000,
                    )
                    await page.click('p:has-text("Roof Binoculars")')
                    await page.wait_for_load_state("domcontentloaded")
                    await page.click('button:has-text("Add To Cart")')
                    await page.wait_for_load_state("domcontentloaded")
                    await page.wait_for_timeout(2000)  # giving the browser time to export the traces
                    logging.info("Product added to cart successfully")
                except Exception as e:
                    logging.error(f"Error in add to cart task: {str(e)}")


async def add_baggage_header(route: Route, request: Request):
    existing_baggage = request.headers.get("baggage", "")
    headers = {
        **request.headers,
        "baggage": ", ".join(filter(None, (existing_baggage, "synthetic_request=true"))),
    }
    await route.continue_(headers=headers)
