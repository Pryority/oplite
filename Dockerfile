FROM node:alpine

WORKDIR /workspace
COPY . /workspace

RUN yarn install && yarn build && npm i -g .

CMD [ "rpc-proxy", "dist/index.js", "--host", "0.0.0.0", "--port", "8546" ]
EXPOSE 8546
