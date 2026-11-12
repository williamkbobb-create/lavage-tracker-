FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
      colmap=3.9.1-2build2 python3 ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/hvie
COPY reconstruct.py /opt/hvie/reconstruct.py
COPY README.md /opt/hvie/README.md

RUN colmap -h >/tmp/colmap-help.txt 2>&1 \
    && python3 -m py_compile /opt/hvie/reconstruct.py

ENTRYPOINT ["python3", "/opt/hvie/reconstruct.py"]
