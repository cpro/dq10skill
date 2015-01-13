#! ruby -E utf-8:utf-8
# coding: utf-8

dir = File.dirname(__FILE__)
produce_table = [
	{
		data: 'dq10skill-data-full.json',
		template: 'index.haml',
		output: '../index.html'
	},
	{
		data: '../dq10skill-monster-data.json',
		template: 'monster.haml',
		output: '../monster.html'
	},
	{
		data: '../dq10skill-anlucea-data.json',
		template: 'anlucea.haml',
		output: '../anlucea.html'
	}
]

require 'rubygems'
require 'haml'
require 'json'

produce_table.each do |entry|
	# スキル等データロード
	data = JSON.parse(File.read("#{dir}/#{entry[:data]}"))
	# HAMLからHTML生成
	File.open("#{dir}/#{entry[:output]}", 'w') do |file|
	  file.puts Haml::Engine.new(File.read("#{dir}/#{entry[:template]}")).render(Object.new, {:data => data})
	end
end
