FROM node:12.18.3

# Create app directory
WORKDIR /usr/src/pacman
COPY package*.json ./

RUN npm install --global gulp-cli
RUN npm install

COPY index.html .
COPY app/ app/
COPY gulpfile.js .

RUN gulp


EXPOSE 8080
CMD [ "npm", "run", "serve" ]
