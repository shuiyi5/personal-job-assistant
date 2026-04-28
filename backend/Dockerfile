FROM python:3.11-slim

# 注意: WeasyPrint 系统依赖在 Railway 构建时可能失败
# 如需 PDF 导出功能，请在本地构建或使用其他部署平台
# RUN apt-get update -y && \
#     apt-get install -y --no-install-recommends \
#     libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0 \
#     libffi-dev shared-mime-info && \
#     apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# 创建数据目录
RUN mkdir -p data/chroma_db data/uploads

ENV PORT=8080
EXPOSE ${PORT}

CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
