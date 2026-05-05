Django MCP Server is an implementation of the Model Context Protocol (MCP) extension for Django. This module allows MCP Clients and AI agents to interact with any Django application seamlessly.

🚀 Django-Style declarative style tools to allow AI Agents and MCP clients tool to interact with Django.
🚀 Expose Django models for AI Agents and MCP Tools to query in 2 lines of code in a safe way.
🚀 Convert Django Rest Framework APIs to MCP tools with one annotation.
✅ Working on both WSGI and ASGI without infrastructure change.
✅ Validated as a Remote Integration with Claude AI.
🤖 Any MCP Client or AI Agent supporting MCP , (Google Agent Developement Kit, Claude AI, Claude Desktop ...) can interact with your application.

Many thanks 🙏 to all the contributor community

Maintained ✨ with care by Smart GTS software engineering.

Licensed under the MIT License.
Features

    Expose Django models and logic as MCP tools.
    Serve an MCP endpoint inside your Django app.
    Easily integrate with AI agents, MCP Clients, or tools like Google ADK.

Quick Start
1️⃣ Install

pip install django-mcp-server

Or directly from GitHub:

pip install git+https://github.com/omarbenhamid/django-mcp-server.git

2️⃣ Configure Django

✅ Add mcp_server to your INSTALLED_APPS:

INSTALLED_APPS = [
    # your apps...
    'mcp_server',
]

✅ Add the MCP endpoint to your urls.py:

from django.urls import path, include

urlpatterns = [
    # your urls...
    path("", include('mcp_server.urls')),
]

By default, the MCP endpoint will be available at /mcp.
3️⃣ Define MCP Tools

In mcp.py create a subclass of ModelQueryToolset to give access to a model :

from mcp_server import ModelQueryToolset
from .models import *


class BirdQueryTool(ModelQueryToolset):
    model = Bird

    def get_queryset(self):
        """self.request can be used to filter the queryset"""
        return super().get_queryset().filter(location__isnull=False)

class LocationTool(ModelQueryToolset):
    model = Location

class CityTool(ModelQueryToolset):
    model = City

Or create a sub class of MCPToolset to publish generic methods (private _ methods are not published)

Example:

from mcp_server import MCPToolset
from django.core.mail import send_mail

class MyAITools(MCPToolset):
    def add(self, a: int, b: int) -> list[dict]:
        """A service to add two numbers together"""
        return a+b

    def send_email(self, to_email: str, subject: str, body: str):
        """ A tool to send emails"""

        send_mail(
             subject=subject,
             message=body,
             from_email='your_email@example.com',
             recipient_list=[to_email],
             fail_silently=False,
         )

Verify with MCP Inspect

Use the management commande mcp_inspect to ensure your tools are correctly declared :

python manage.py mcp_inspect

Use the MCP with any MCP Client

The mcp tool is now published on your Django App at /mcp endpoint.

IMPORTANT For production setup, on non-public data, consider enabling authorization through : DJANGO_MCP_AUTHENTICATION_CLASSES
Test with MCP Python SDK

You can test it with the python mcp SDK :

from mcp.client.streamable_http import streamablehttp_client
from mcp import ClientSession


async def main():
    # Connect to a streamable HTTP server
    async with streamablehttp_client("http://localhost:8000/mcp") as (
        read_stream,
        write_stream,
        _,
    ):
        # Create a session using the client streams
        async with ClientSession(read_stream, write_stream) as session:
            # Initialize the connection
            await session.initialize()
            # Call a tool
            tool_result = await session.call_tool("get_alerts", {"state": "NY"})
            print(tool_result)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())

Replace http://localhost:8000/mcp by the acutal Django host and run this cript.
Use from Claude AI

As of June 2025 Claude AI support now MCPs through streamable HTTP protocol with preè-requisites : *

    Setup OAuth2, for example :
        Install Django Oauth Toolkit)
        Include 'oauth2_provider.contrib.rest_framework.OAuth2Authentication' in DJANGO_MCP_AUTHENTICATION_CLASSES in settings.py
    Claude AI requires Dynamic Client Registration. as of today it is not supported by django oauth toolkit but you can use This Django Oauth Toolkit DCR Add-On
    Unless you implement OAuth server Metadata RFC correctly, you need to keep OAuth2 URLS (/register, /token and /authorize at their default location).

Test in Claude Desktop

You can test MCP servers in Claude Desktop. As for now claude desktop only supports local MCP Servers. So you need to have your app installed on the same machine, in a dev setting probably.

For this you need :

    To install Claude Desktop from claude.ai
    Open File > Settings > Developer and click Edit Config
    Open claude_desktop_config.json and setup your MCP server :

    {
     "mcpServers": {
         "test_django_mcp": {
             "command": "/path/to/interpreter/python",
             "args": [
                 "/path/to/your/project/manage.py",
                 "stdio_server"
             ]
         }
     }

NOTE /path/to/interpreter/ should point to a python interpreter you use (can be in your venv for example) and /path/to/your/project/ is the path to your django project.
Advanced topics
Publish Django Rest Framework APIs as MCP Tools

You can use drf_publish_create_mcp_tool / drf_publish_update_mcp_tool / drf_publish_delete_mcp_tool / drf_publish_list_mcp_tool as annotations or method calls to register DRF CreateModelMixin / UpdateModelMixin / DestroyModelMixin / ListModelMixin based views to MCP tools seamlessly. Django MCP Server will generate the schemas to allow MCP Clients to use them.

NOTE in some older DRF versions schema generation is not supported out of the box, you should then provide to the registration annotation the

from mcp_server import drf_publish_create_mcp_tool

@drf_publish_create_mcp_tool
class MyModelView(CreateAPIView):
    """
    A view to create MyModel instances
    """
    serializer_class=MySerializer

notice that the docstring of the view is used as instructions for the model. You can better tune this like :

@drf_publish_create_mcp_tool(instructions="Use this view to create instances of MyModel")
class MyModelView(CreateAPIView):
    """
    A view to create MyModel instances
    """
    serializer_class=MySerializer

Finally, you can register after hand in mcp.py for example with:

drf_publish_update_mcp_tool(MyDRFAPIView, instructions="Use this tool to update my model, but use it with care")

IMPORTANT

Notice that builti-in authentication classes are disabled by default along with filter_backends, permission_classes and pagination_class, that's because the MCP authentication is used.

Since the pagination_class is also disabled, you will need to account for that if you're using an existing paginated DRF view (self.paginator will be None).
Django Rest Framework Serializer integration

You can annotate a tool with drf_serialize_output(...) to serialize its output using django rest framework, like :

from mcp_server import drf_serialize_output
from .serializers import FooBarSerializer
from .models import FooBar

class MyTools(MCPToolset):
   @drf_serialize_output(FooBarSerializer)
   def get_foo_bar():
       return FooBar.objects.first()

Use low level mcp server annotation

You can import the DjangoMCP server instance and use FastMCP annotations to declare mcp tools and resources :

from mcp_server import mcp_server as mcp
from .models import Bird


@mcp.tool()
async def get_species_count(name: str) -> int:
    '''Find the ID of a bird species by name (partial match). Returns the count.'''
    ret = await Bird.objects.filter(species__icontains=name).afirst()
    if ret is None:
        ret = await Bird.objects.acreate(species=name)
    return ret.count

@mcp.tool()
async def increment_species(name: str, amount: int = 1) -> int:
    '''
    Increment the count of a bird species by a specified amount.
    Returns the new count.
    '''
    ret = await Bird.objects.filter(species__icontains=name).afirst()
    if ret is None:
        ret = await Bird.objects.acreate(species=name)
    ret.count += amount
    await ret.asave()
    return ret.count

⚠️ Important:

    Always use Django's async ORM API when you define async tools.
    Be careful not to return a QuerySet as it will be evaluated asynchroniously which would create errors.

Customize the default MCP server settings

In settings.py you can initialize the DJANGO_MCP_GLOBAL_SERVER_CONFIG parameter. These will be passed to the MCPServer server during initialization

DJANGO_MCP_GLOBAL_SERVER_CONFIG = {
    "name":"mymcp",
    "instructions": "Some instructions to use this server",
    "stateless": False
}

Session management

By default the server is statefull, and state is managed as Django session request.session object, so the session backend must thus be set up correctly. The request object is available in self.request for class based toolsets.

NOTE The session middleware is not required to be set up as MCP sessions are managed independently and without cookies. . You can make the server stateless by defining : DJANGO_MCP_GLOBAL_SERVER_CONFIG

IMPORTANT state is managed by django sessions, if you use low level @mcp_server.tool() annotation for example the behaviour of preserving the server instance accross calls of the base python API is not preserved due to architecture of django in WSGI deployments where requests can be served by different threads !
Authorization

The MCP endpoint supports Django Rest Framework authorization classes You can set them using DJANGO_MCP_AUTHENTICATION_CLASSES in settings.py ex. :

DJANGO_MCP_AUTHENTICATION_CLASSES=["rest_framework.authentication.TokenAuthentication"]

IMPORTANT Now the MCP Specification version 2025-03-26 advices to use an OAuth2 workflow, so you should integrate django-oauth-toolkit with djangorestframework integration setup, and use 'oauth2_provider.contrib.rest_framework.OAuth2Authentication' in DJANGO_MCP_AUTHENTICATION_CLASSES. Refer to the official documentation of django-oauth-toolkit
Advanced / customized setup of the view

You can in your urls.py mount the MCPServerStreamableHttpView.as_view() view and customize it with any extra parameters.
Custom output format (renderers) for ModelQueryToolset

You can define any DRF rendrer to produce output, for this it must be declared in your settings:

DJANGO_MCP_OUTPUT_RENDERER_CLASSES = [
    "rest_framework.renderers.JSONRenderer",
    "rest_framework_csv.renderers.CSVRenderer"
]

Then in your ModelQueryToolset declaration you can add

    ...
    output_format="csv"

further you can instruct the tool to attach the result as an [MCP Embedded Resource] rather than direct return with

    ...
    output_as_resource=True

NOTE some renderers like drf-excel are designed in a way that does not allow using them outside of DRF View, they will not work here..
Secondary MCP endpoint

in mcp.py

from mcp_server.djangomcp import DjangoMCP

second_mcp = DjangoMCP(name="altserver")

@second_mcp.tool()
async def my_tool():
    ...

in urls.py

...
from yourapp.mcp import second_mcp
...
path("altmcp", MCPServerStreamableHttpView.as_view(mcp_server=second_mcp))
...

IMPORTANT When you do this the DJANGO_MCP_AUTHENTICATION_CLASSES settings is ignored and your view is unsecure. You SHOULD Setup DRF Authentication for your view, for exemple :

...
MCPServerStreamableHttpView.as_view(permission_classes=[IsAuthenticated], authentication_classes=[TokenAuthentication])
...

Testing
The server

You can setup you own app or use the mcpexample django app app.
The client

By default, your MCP Server will be available as a stateless streamable http transport endpoint at <your_django_server>/mcp (ex. http://localhost:8000/mcp) (*without / at the end !).

There are many ways to test :

    Using the test MCP Client script : test/test_mcp_client.py
    You can test using MCP Inspector tool
    or any compatible MCP Client like google agent developement kit.

Integration with Agentic Frameworks and MCP Clients
Google Agent Developement Kit Example

NOTE as of today the official google adk does not support StreamableHTTP Transport but you could use this fork

Then you can use the test agent in test/test_agent with by starting adk web in the test folder. Make sure first :

    Install adk with streamablehttp support : pip install git+https://github.com/omarbenhamid/google-adk-python.git
    Start a django app with an MCP endpoint : python manage.py runserver in the examples/mcpexample folder.
    If you use TokenAuthorization create an access token, for example in Django Admin of your app.
    Setup in test/test_agent/agent.py the right endpoint location and authentication header
    Enter the test folder.
    Run adk web
    In the shell you can for example use this prompt : "I saw woody woodpecker, add it to my inventory"

Other clients

You can easily plug your MCP server endpoint into any agentic framework supporting MCP streamable http servers. Refer to this list of clients
Settings

    DJANGO_MCP_GLOBAL_SERVER_CONFIG a configuration dictionnary for the global MCP server default to empty. It can include the following parmaters
        name: a name for the server
        instructions: global instructions
        stateless : when set to 'True' the server will not manage sessions

    DJANGO_MCP_AUTHENTICATION_CLASSES (default to no authentication) a list of reference to Django Rest Framework authentication classes to enfors in the main MCP view.

    DJANGO_MCP_GET_SERVER_INSTRUCTIONS_TOOL (default=True) if true a tool will be offered to obtain global instruction and tools will instruct the agent to use it, as agents do not always have the MCP server global instructions included in their system prompt.

    DJANGO_MCP_ENDPOINT (default="mcp") a string indicating the url endpoint used by the server. If you want it to have a trailing slash, for example, set it to "mcp/"

Roadmap

    ✅ Stateless streamable HTTP transport (implemented)
    🔜 STDIO transport integration for dev configuration (ex. Claude Desktop)
    🔜 ****
    🔜 Stateful streamable HTTP transport using Django sessions
    🔜 SSE endpoint integration (requires ASGI)
    🔜 Improved error management and logging
