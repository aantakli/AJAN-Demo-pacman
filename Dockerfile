FROM node:12.18

# Create app directory
WORKDIR /usr/src/pacman
COPY package*.json ./

RUN npm install

COPY index.html .
COPY build build/y
COPY app/ app/


EXPOSE 8080
CMD [ "npm", "run", "serve" ]
