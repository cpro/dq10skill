#! ruby -E utf-8:utf-8
# coding: utf-8

dir = File.dirname(__FILE__)
source_json_path = "#{dir}/dq10skill-data-full.json"
produced_json_path = "#{dir}/../dq10skill-data.json"

require 'rubygems'
require 'haml'
require 'json'

data = JSON.parse(File.read(source_json_path))

data['skillLines'].each_value do |skill_line|
	skill_line['skills'].each do |skill|
		%w(name desc mp charge).each {|key| skill.delete(key)} 
	end
	%w(abbr).each {|key| skill_line.delete(key)}
end

data['vocations'].each_value do |voc|
	%w(name abbr).each {|key| voc.delete(key)}
end

%w(_vocations_coming trainingPts).each {|key| data.delete(key)}

# HAMLからHTML生成
File.open(produced_json_path, 'w') do |file|
  file.puts JSON.dump(data)
end
