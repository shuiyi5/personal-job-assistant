FROM python:3.11-slim

# WeasyPrint 系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0 \
    libffi-dev shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# 创建数据目录
RUN mkdir -p data/chroma_db data/uploads

ENV PORT=8000
EXPOSE ${PORT}

# Railway 通过 $PORT 环境变量指定端口
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
