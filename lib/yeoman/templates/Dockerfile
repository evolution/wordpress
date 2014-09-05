FROM ubuntu:14.04

ENV DOCKER true
ENV DEBIAN_FRONTEND noninteractive
ENV HOME /root

RUN apt-get -qq -y update && apt-get -qq -y install software-properties-common
RUN apt-add-repository -y ppa:ansible/ansible
RUN apt-get -qq -y update && apt-get -qq -y install ansible

ADD . /vagrant
EXPOSE 22 80 443 3306

WORKDIR /vagrant/lib/ansible
RUN ansible-playbook provision.yml --connection=local -e stage=local

WORKDIR /vagrant

CMD ["/bin/bash", "-i"]

