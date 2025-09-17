import { Router } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

const router = Router();

// Serve OpenAPI specification
router.get('/openapi.yaml', (req, res) => {
  try {
    const yamlPath = join(__dirname, '../docs/openapi.yaml');
    const yamlContent = readFileSync(yamlPath, 'utf8');
    
    res.setHeader('Content-Type', 'application/x-yaml');
    res.send(yamlContent);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load OpenAPI specification' });
  }
});

router.get('/openapi.json', (req, res) => {
  try {
    const yamlPath = join(__dirname, '../docs/openapi.yaml');
    const yamlContent = readFileSync(yamlPath, 'utf8');
    const jsonContent = yaml.load(yamlContent);
    
    res.json(jsonContent);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load OpenAPI specification' });
  }
});

// Swagger UI HTML page
router.get('/swagger', (req, res) => {
  const swaggerHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>PRISM API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin:0;
      background: #fafafa;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: '/docs/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        tryItOutEnabled: true,
        requestInterceptor: function(request) {
          // Add authorization header if token exists in localStorage
          const token = localStorage.getItem('prism_token');
          if (token) {
            request.headers['Authorization'] = 'Bearer ' + token;
          }
          return request;
        }
      });
    };
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(swaggerHtml);
});

// API documentation landing page
router.get('/', (req, res) => {
  const docsHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PRISM API Documentation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
    }
    .api-section {
      margin: 30px 0;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 6px;
      border-left: 4px solid #3498db;
    }
    .api-section h3 {
      margin-top: 0;
      color: #2c3e50;
    }
    .endpoint-list {
      list-style: none;
      padding: 0;
    }
    .endpoint-list li {
      margin: 8px 0;
      padding: 8px 12px;
      background: white;
      border-radius: 4px;
      border-left: 3px solid #27ae60;
    }
    .method {
      font-weight: bold;
      color: #e74c3c;
      margin-right: 10px;
    }
    .method.get { color: #27ae60; }
    .method.post { color: #3498db; }
    .method.put { color: #f39c12; }
    .method.delete { color: #e74c3c; }
    .btn {
      display: inline-block;
      padding: 12px 24px;
      background: #3498db;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      margin: 10px 10px 10px 0;
      transition: background 0.3s;
    }
    .btn:hover {
      background: #2980b9;
    }
    .btn.secondary {
      background: #95a5a6;
    }
    .btn.secondary:hover {
      background: #7f8c8d;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🏔️ PRISM API Documentation</h1>
    <p>
      Welcome to the PRISM (Predictive Rockfall Intelligence & Safety Management) API documentation.
      This API provides secure access to all PRISM services and external system integrations.
    </p>

    <div style="margin: 30px 0;">
      <a href="/docs/swagger" class="btn">📖 Interactive API Explorer</a>
      <a href="/docs/openapi.json" class="btn secondary">📄 OpenAPI JSON</a>
      <a href="/docs/openapi.yaml" class="btn secondary">📄 OpenAPI YAML</a>
    </div>

    <div class="api-section">
      <h3>🔐 Authentication</h3>
      <p>All protected endpoints require a Bearer token obtained through the login endpoint.</p>
      <ul class="endpoint-list">
        <li><span class="method post">POST</span> /auth/login - User authentication</li>
        <li><span class="method post">POST</span> /auth/logout - Session termination</li>
        <li><span class="method post">POST</span> /auth/refresh - Token refresh</li>
      </ul>
    </div>

    <div class="api-section">
      <h3>🚛 Fleet Management Integration</h3>
      <p>Integration endpoints for fleet management systems.</p>
      <ul class="endpoint-list">
        <li><span class="method post">POST</span> /api/integrations/fleet/alert - Send rockfall alerts</li>
        <li><span class="method post">POST</span> /api/integrations/fleet/reroute - Request truck rerouting</li>
        <li><span class="method get">GET</span> /api/integrations/fleet/trucks - Get active trucks</li>
        <li><span class="method post">POST</span> /api/integrations/fleet/stop-operations - Stop operations in zone</li>
      </ul>
    </div>

    <div class="api-section">
      <h3>💥 Blast Planning Integration</h3>
      <p>Integration endpoints for blast planning systems.</p>
      <ul class="endpoint-list">
        <li><span class="method post">POST</span> /api/integrations/blast/assessment - Submit slope stability assessment</li>
        <li><span class="method post">POST</span> /api/integrations/blast/optimize - Request blast optimization</li>
        <li><span class="method get">GET</span> /api/integrations/blast/upcoming - Get upcoming blasts</li>
        <li><span class="method post">POST</span> /api/integrations/blast/postpone - Postpone blast</li>
      </ul>
    </div>

    <div class="api-section">
      <h3>💧 Water Management Integration</h3>
      <p>Integration endpoints for water management systems.</p>
      <ul class="endpoint-list">
        <li><span class="method post">POST</span> /api/integrations/water/groundwater - Submit groundwater data</li>
        <li><span class="method post">POST</span> /api/integrations/water/drainage-recommendation - Submit drainage recommendations</li>
        <li><span class="method post">POST</span> /api/integrations/water/pumping-control - Control pumping stations</li>
        <li><span class="method post">POST</span> /api/integrations/water/water-level-alert - Send water level alerts</li>
        <li><span class="method get">GET</span> /api/integrations/water/pumping-stations - Get active pumping stations</li>
        <li><span class="method post">POST</span> /api/integrations/water/emergency-drainage - Request emergency drainage</li>
      </ul>
    </div>

    <div class="api-section">
      <h3>🏥 System Health</h3>
      <p>Health check and monitoring endpoints.</p>
      <ul class="endpoint-list">
        <li><span class="method get">GET</span> /health - API Gateway health</li>
        <li><span class="method get">GET</span> /api/integrations/health - Integration services health</li>
      </ul>
    </div>

    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
      <p>
        <strong>Rate Limiting:</strong> API requests are limited to 1000 requests per 15-minute window per IP address.
      </p>
      <p>
        <strong>Support:</strong> For API support, contact <a href="mailto:api-support@prism.mining">api-support@prism.mining</a>
      </p>
    </div>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(docsHtml);
});

export { router as docsRouter };