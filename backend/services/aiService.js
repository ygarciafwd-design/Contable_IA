const Anthropic = require('@anthropic-ai/sdk');
const sequelize = require('../config/database');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Esquema de BD para contexto de la IA
async function getDatabaseSchema() {
  try {
    const [tables] = await sequelize.query(`
      SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME}'
      ORDER BY TABLE_NAME, ORDINAL_POSITION
    `);

    const schema = {};
    tables.forEach(col => {
      if (!schema[col.TABLE_NAME]) schema[col.TABLE_NAME] = [];
      schema[col.TABLE_NAME].push(`${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });

    return Object.entries(schema)
      .map(([table, cols]) => `TABLA ${table}: ${cols.join(', ')}`)
      .join('\n');
  } catch (error) {
    return 'Esquema no disponible';
  }
}

// Detectar si la pregunta requiere consulta a BD
function requiresDatabaseQuery(message) {
  const dbKeywords = [
    'cuánto', 'cuántos', 'total', 'suma', 'promedio', 'listar', 'mostrar',
    'facturas', 'clientes', 'ventas', 'gastos', 'ingresos', 'balance',
    'reportes', 'usuario', 'transacciones', 'cuentas', 'saldo',
    'cuantos', 'cuanta', 'dame', 'consulta', 'busca', 'encuentra',
    'how many', 'total of', 'list all', 'show me'
  ];
  const lower = message.toLowerCase();
  return dbKeywords.some(kw => lower.includes(kw));
}

// Ejecutar SQL generado por IA de forma segura
async function executeSafeSQL(sql) {
  const dangerousPatterns = /\b(DROP|DELETE|TRUNCATE|INSERT|UPDATE|ALTER|CREATE|GRANT|REVOKE)\b/i;
  if (dangerousPatterns.test(sql)) {
    throw new Error('Solo se permiten consultas SELECT por seguridad.');
  }

  const cleanSQL = sql.trim().replace(/;+$/, '') + ' LIMIT 500';
  const [results, metadata] = await sequelize.query(cleanSQL);
  return { results, rowCount: results.length };
}

// Generar SQL desde lenguaje natural
async function generateSQL(userQuestion, schema) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: `Eres un experto en SQL MySQL. Convierte preguntas en lenguaje natural a consultas SQL SELECT válidas.
    
Esquema de la base de datos:
${schema}

REGLAS:
- Solo genera consultas SELECT (nunca INSERT, UPDATE, DELETE, DROP)
- Usa alias descriptivos en español
- Limita resultados con LIMIT cuando sea apropiado
- Responde SOLO con el SQL, sin explicaciones ni markdown
- Si no puedes generar un SQL válido, responde: CANNOT_GENERATE`,
    messages: [{ role: 'user', content: userQuestion }],
  });

  return response.content[0].text.trim();
}

// Servicio principal del chat
exports.processMessage = async ({ userMessage, conversationHistory, documentContext, user }) => {
  const startTime = Date.now();

  const systemPrompt = `Eres ContableIA, un asistente contable y financiero inteligente de alta especialización. Trabajas para ${user.name} (${user.role}).

Tu expertise incluye:
- Contabilidad general, NIIF/IFRS, principios contables
- Declaraciones de impuestos, IVA, renta, retenciones
- Análisis financiero y generación de reportes
- Nómina y recursos humanos
- Consultas directas a la base de datos del sistema
- Interpretación de documentos financieros

COMPORTAMIENTO:
- Responde en español con tono profesional pero accesible
- Sé preciso con cifras y términos contables
- Cuando des cifras importantes, formatea en tablas markdown
- Si el usuario pide datos del sistema, ejecutarás la consulta correspondiente
- Incluye siempre recomendaciones prácticas cuando sea relevante
- Para reportes, genera formato estructurado

${documentContext ? `\nCONTEXTO DE DOCUMENTOS CARGADOS:\n${documentContext}` : ''}`;

  let sqlExecuted = null;
  let sqlResults = null;
  let finalMessage = userMessage;

  // Verificar si requiere consulta a BD
  if (requiresDatabaseQuery(userMessage) && (user.role === 'admin' || user.role === 'contador')) {
    try {
      const schema = await getDatabaseSchema();
      const generatedSQL = await generateSQL(userMessage, schema);

      if (generatedSQL && !generatedSQL.includes('CANNOT_GENERATE')) {
        sqlExecuted = generatedSQL;
        const { results, rowCount } = await executeSafeSQL(generatedSQL);
        sqlResults = results;

        finalMessage = `${userMessage}

[DATOS DE LA BASE DE DATOS - ${rowCount} registro(s) encontrado(s)]:
${JSON.stringify(results.slice(0, 50), null, 2)}

Por favor, analiza estos datos y responde la pregunta original de forma clara.`;
      }
    } catch (sqlError) {
      console.error('SQL generation error:', sqlError);
    }
  }

  // Preparar historial para la IA
  const messages = [
    ...conversationHistory.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    })),
    { role: 'user', content: finalMessage },
  ];

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: systemPrompt,
    messages,
  });

  const assistantMessage = response.content[0].text;
  const processingTime = Date.now() - startTime;

  return {
    message: assistantMessage,
    sqlExecuted,
    sqlResults,
    tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    processingTime,
    type: sqlExecuted ? 'sql_result' : 'text',
  };
};

// Generar reporte desde conversación
exports.generateReport = async (conversationMessages, reportType) => {
  const history = conversationMessages.map(m => `${m.role}: ${m.content}`).join('\n');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    system: `Eres un experto contable. Genera reportes financieros profesionales en formato markdown.`,
    messages: [{
      role: 'user',
      content: `Basándote en esta conversación, genera un reporte de tipo "${reportType}":

${history}

Genera un reporte profesional con: resumen ejecutivo, datos clave, análisis, recomendaciones y conclusiones.`,
    }],
  });

  return response.content[0].text;
};

// Resumir PDF para RAG
exports.summarizeDocument = async (text, filename) => {
  const truncated = text.substring(0, 8000);
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `Resume este documento financiero/contable "${filename}" extrayendo: tipo de documento, fechas, montos clave, partes involucradas, conceptos contables relevantes:\n\n${truncated}`,
    }],
  });
  return response.content[0].text;
};
