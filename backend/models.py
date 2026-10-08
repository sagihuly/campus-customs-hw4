"""Request and response models shared by the chat API and agent."""

from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)

    @field_validator("content")
    @classmethod
    def strip_content(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Message content cannot be empty.")
        return value


class ChatPageContext(BaseModel):
    """Non-sensitive navigation context; product identity is verified by the server."""

    page_type: Literal["home", "products", "product", "about", "login", "create-account", "other"] = "other"
    product_id: str | None = Field(default=None, min_length=1, max_length=200)

    @model_validator(mode="after")
    def product_id_only_on_product_page(self) -> "ChatPageContext":
        if self.page_type != "product" and self.product_id is not None:
            raise ValueError("A product ID is only allowed for a product page.")
        return self


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=24)
    conversation_id: int | None = Field(default=None, ge=1)
    page_context: ChatPageContext = Field(default_factory=ChatPageContext)

    @model_validator(mode="after")
    def user_message_must_be_last(self) -> "ChatRequest":
        if self.messages[0].role != "user" or self.messages[-1].role != "user":
            raise ValueError("Chat history must start and end with a user message.")
        return self


class InventoryStock(BaseModel):
    size: str = Field(description="Size label from the inventory table.")
    quantity: int = Field(ge=0, description="Current quantity for this size; zero means out of stock.")


class ProductToolResult(BaseModel):
    """Database-backed facts the Agent may use to answer product questions."""

    product_id: str = Field(description="Exact catalogue product identifier.")
    name: str = Field(description="Product name as stored in the catalogue.")
    garment_type: str = Field(description="Product type as stored in the catalogue.")
    description: str = Field(description="Product description from the catalogue.")
    colors: list[str] = Field(description="Colors listed for this product.")
    price: float = Field(ge=0, description="Numeric price from the catalogue; do not estimate or convert it.")
    total_stock: int = Field(ge=0, description="Sum of current inventory quantities across sizes.")
    inventory: list[InventoryStock] = Field(
        default_factory=list,
        description="Current quantity for each size; preserve zero quantities to report sold-out sizes.",
    )


class ChatProduct(ProductToolResult):
    """ProductToolResult plus fields required to render a storefront product card."""

    search_tags: list[str]
    image_url: str


class ChatHistoryMessage(BaseModel):
    id: int
    role: Literal["user", "assistant"]
    content: str
    products: list[ChatProduct] = Field(default_factory=list)
    search_performed: bool = False
    created_at: str


class ChatConversationSummary(BaseModel):
    id: int
    title: str
    created_at: str
    updated_at: str
    message_count: int = Field(ge=0)


class ChatConversationHistory(ChatConversationSummary):
    messages: list[ChatHistoryMessage] = Field(default_factory=list)


class ChatResponse(BaseModel):
    reply: str = Field(min_length=1)
    products: list[ChatProduct] = Field(default_factory=list)
    search_performed: bool = Field(
        default=False,
        description="Whether the current Agent turn searched the product catalogue.",
    )
    conversation_id: int | None = Field(default=None, ge=1)
